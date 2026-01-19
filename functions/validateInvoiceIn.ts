import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return Response.json({ error: 'invoice_id is required' }, { status: 400 });
    }

    // Buscar nota fiscal
    const invoice = await base44.entities.InvoiceIn.get(invoice_id);

    if (!invoice || invoice.company_id !== user.company_id) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'validated') {
      return Response.json({ error: 'Invoice already validated' }, { status: 400 });
    }

    // Buscar depósito padrão se não especificado
    let warehouseId = invoice.warehouse_id;
    if (!warehouseId) {
      const warehouses = await base44.entities.Warehouse.filter({
        company_id: user.company_id,
        is_deleted: { '$ne': true },
        status: 'active'
      });
      warehouseId = warehouses[0]?.id || 'default';
    }

    // Processar cada item da nota
    const stockMovements = [];
    const balanceUpdates = [];

    for (const item of invoice.items || []) {
      // Criar movimento de estoque
      const movement = await base44.entities.StockMovement.create({
        company_id: user.company_id,
        product_id: item.product_id,
        movement_type: 'in',
        movement_date: new Date().toISOString(),
        quantity: item.quantity,
        unit_cost: item.final_unit_cost,
        reference_type: 'invoice_in',
        reference_id: invoice_id,
        user_email: user.email
      });
      stockMovements.push(movement);

      // Atualizar saldo de estoque
      const existingBalance = await base44.entities.StockBalance.filter({
        company_id: user.company_id,
        product_id: item.product_id,
        warehouse_id: warehouseId
      });

      if (existingBalance.length > 0) {
        const balance = existingBalance[0];
        const oldQty = balance.available_quantity || 0;
        const oldCost = balance.average_cost || 0;
        const newQty = oldQty + item.quantity;
        const newCost = ((oldQty * oldCost) + (item.quantity * item.final_unit_cost)) / newQty;

        await base44.entities.StockBalance.update(balance.id, {
          available_quantity: newQty,
          average_cost: newCost,
          last_movement_date: new Date().toISOString(),
          last_cost_update: new Date().toISOString()
        });
        balanceUpdates.push({ product_id: item.product_id, newQty, newCost });
      } else {
        const newBalance = await base44.entities.StockBalance.create({
          company_id: user.company_id,
          product_id: item.product_id,
          warehouse_id: invoice.warehouse_id || 'default',
          available_quantity: item.quantity,
          average_cost: item.final_unit_cost,
          last_movement_date: new Date().toISOString(),
          last_cost_update: new Date().toISOString()
        });
        balanceUpdates.push({ product_id: item.product_id, newQty: item.quantity, newCost: item.final_unit_cost });
      }
    }

    // Gerar contas a pagar
    await base44.entities.AccountsPayable.create({
      company_id: user.company_id,
      invoice_in_id: invoice_id,
      supplier_id: invoice.supplier_id,
      document_number: invoice.invoice_number,
      installment: 1,
      total_installments: 1,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      gross_value: invoice.total_value,
      net_value: invoice.total_value,
      status: 'pending'
    });

    // Atualizar status da nota fiscal
    await base44.entities.InvoiceIn.update(invoice_id, {
      status: 'validated',
      validated_by: user.email,
      validated_at: new Date().toISOString(),
      stock_moved: true,
      payables_generated: true
    });

    return Response.json({
      success: true,
      stock_movements: stockMovements.length,
      balance_updates: balanceUpdates.length,
      message: 'Nota fiscal validada com sucesso'
    });

  } catch (error) {
    console.error('Error validating invoice:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});