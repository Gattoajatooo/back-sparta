import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        if (!(await base44.auth.isAuthenticated())) {
            return Response.json({ 
                success: false,
                error: 'Unauthorized' 
            }, {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const user = await base44.auth.me();
        if (!user?.company_id) {
            return Response.json({ 
                success: false,
                error: 'No company found' 
            }, {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { field } = await req.json();

        if (!field) {
            return Response.json({ 
                success: false,
                error: 'Field parameter is required' 
            }, {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('Buscando opções para o campo:', field);

        let processedValues = [];

        // Handle special fields that don't require querying contacts
        if (field === 'gender') {
            processedValues = ['Masculino', 'Feminino', 'Outro', 'Não Informado'];
            
            return Response.json({
                success: true,
                field: field,
                options: processedValues,
                count: processedValues.length
            }, {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (field === 'tags_system') {
            // Get all active system tags
            const systemTags = await base44.entities.SystemTag.filter({ is_active: true });
            processedValues = systemTags.map(tag => tag.name).sort();
            
            return Response.json({
                success: true,
                field: field,
                options: processedValues,
                count: processedValues.length
            }, {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (field === 'tags') {
            // Get all tags from the company
            const companyTags = await base44.entities.Tag.filter({ 
                company_id: user.company_id,
                is_active: true
            });
            processedValues = companyTags.map(tag => tag.name).sort();
            
            return Response.json({
                success: true,
                field: field,
                options: processedValues,
                count: processedValues.length
            }, {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get all contacts for the company
        const contacts = await base44.entities.Contact.filter({ 
            company_id: user.company_id,
            deleted: { '$ne': true }
        });
        
        console.log('Total de contatos encontrados:', contacts.length);

        let uniqueValues = new Set();

        switch (field) {
            case 'company_name':
                contacts.forEach(contact => {
                    if (contact.company_name && typeof contact.company_name === 'string' && contact.company_name.trim()) {
                        uniqueValues.add(contact.company_name.trim());
                    }
                });
                processedValues = Array.from(uniqueValues).sort();
                break;

            case 'position':
                contacts.forEach(contact => {
                    if (contact.position && typeof contact.position === 'string' && contact.position.trim()) {
                        uniqueValues.add(contact.position.trim());
                    }
                    if (contact.custom_position && typeof contact.custom_position === 'string' && contact.custom_position.trim()) {
                        uniqueValues.add(contact.custom_position.trim());
                    }
                });
                processedValues = Array.from(uniqueValues).sort();
                break;

            case 'source':
                contacts.forEach(contact => {
                    if (contact.source && typeof contact.source === 'string' && contact.source.trim()) {
                        uniqueValues.add(contact.source.trim());
                    }
                });
                processedValues = Array.from(uniqueValues).sort();
                break;

            case 'status':
                contacts.forEach(contact => {
                    if (contact.status && typeof contact.status === 'string' && contact.status.trim()) {
                        uniqueValues.add(contact.status.trim());
                    }
                });
                processedValues = Array.from(uniqueValues).sort();
                break;

            case 'import_name':
                contacts.forEach(contact => {
                    if (contact.import_name && typeof contact.import_name === 'string' && contact.import_name.trim()) {
                        uniqueValues.add(contact.import_name.trim());
                    }
                });
                processedValues = Array.from(uniqueValues).sort();
                break;

            case 'import_type':
                contacts.forEach(contact => {
                    if (contact.import_type && typeof contact.import_type === 'string' && contact.import_type.trim()) {
                        uniqueValues.add(contact.import_type.trim());
                    }
                });
                processedValues = Array.from(uniqueValues).sort();
                break;

            default:
                console.log('Campo não suportado:', field);
                return Response.json({ 
                    success: false,
                    error: 'Unsupported field' 
                }, {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
        }

        console.log(`Opções encontradas para ${field}:`, processedValues);

        return Response.json({
            success: true,
            field: field,
            options: processedValues,
            count: processedValues.length
        }, {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get filter options error:', error);
        return Response.json({
            success: false,
            error: 'Internal server error',
            details: error.message
        }, {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});