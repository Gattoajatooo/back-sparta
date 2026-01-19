import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Unauthorized' 
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const user = await base44.auth.me();
        if (!user?.company_id) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'No company found' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { contactData, excludeId = null } = await req.json();

        try {
            // Buscar todos os contatos da empresa para verificar duplicatas
            const existingContacts = await base44.entities.Contact.filter({ 
                company_id: user.company_id 
            });

            // Verificar duplicatas por document_number
            if (contactData.document_number) {
                const duplicateByDocument = existingContacts.find(c =>
                    c.id !== excludeId &&
                    c.document_number === contactData.document_number
                );
                if (duplicateByDocument) {
                    return new Response(JSON.stringify({
                        success: true,
                        hasDuplicate: true,
                        duplicate: {
                            contact: duplicateByDocument,
                            field: 'document_number',
                            value: contactData.document_number
                        }
                    }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }

            // Verificar duplicatas por email
            const primaryEmail = contactData.emails?.find(e => e.type === 'primary')?.email || contactData.email;
            if (primaryEmail) {
                const duplicateByEmail = existingContacts.find(c => {
                    if (c.id === excludeId) return false;

                    // Verificar email principal
                    if (c.email && c.email.toLowerCase() === primaryEmail.toLowerCase()) {
                        return true;
                    }

                    // Verificar array de emails
                    if (c.emails && Array.isArray(c.emails)) {
                        return c.emails.some(email =>
                            email.email && email.email.toLowerCase() === primaryEmail.toLowerCase()
                        );
                    }

                    return false;
                });
                if (duplicateByEmail) {
                    return new Response(JSON.stringify({
                        success: true,
                        hasDuplicate: true,
                        duplicate: {
                            contact: duplicateByEmail,
                            field: 'email',
                            value: primaryEmail
                        }
                    }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }

            // Verificar duplicatas por telefone
            const primaryPhone = contactData.phones?.find(p => p.type === 'primary')?.phone || contactData.phone;
            if (primaryPhone) {
                const cleanPhone = primaryPhone.replace(/\D/g, '');
                const duplicateByPhone = existingContacts.find(c => {
                    if (c.id === excludeId) return false;

                    // Verificar telefone principal
                    if (c.phone && c.phone.replace(/\D/g, '') === cleanPhone) {
                        return true;
                    }

                    // Verificar array de telefones
                    if (c.phones && Array.isArray(c.phones)) {
                        return c.phones.some(phone =>
                            phone.phone && phone.phone.replace(/\D/g, '') === cleanPhone
                        );
                    }

                    return false;
                });
                if (duplicateByPhone) {
                    return new Response(JSON.stringify({
                        success: true,
                        hasDuplicate: true,
                        duplicate: {
                            contact: duplicateByPhone,
                            field: 'phone',
                            value: primaryPhone
                        }
                    }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }

            // Nenhuma duplicata encontrada
            return new Response(JSON.stringify({
                success: true,
                hasDuplicate: false,
                duplicate: null
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error("Error checking for duplicates:", error);
            return new Response(JSON.stringify({
                success: false,
                error: "Error checking for duplicates",
                details: error.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error("Check duplicates error:", error);
        return new Response(JSON.stringify({
            success: false,
            error: "Internal server error",
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});