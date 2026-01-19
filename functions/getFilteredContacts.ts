import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // ✅ CORRIGIDO: Remover verificação isAuthenticated() que pode causar problemas
        // A verificação do user já é suficiente
        const user = await base44.auth.me();
        
        if (!user?.company_id) {
            return Response.json({ 
                success: false,
                error: 'Unauthorized - No company found' 
            }, {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { 
            company_id, 
            searchTerm = "", 
            selectedCampaigns = [], 
            selectedTags = [],
            selectedSystemTags = [],
            selectedImports = [],
            selectedResponsibles = [],
            sortBy = "created_date",
            sortOrder = "desc",
            page = 1,
            limit = 100,
            filters = [],
            deleted = false
        } = await req.json();

        const companyId = company_id || user.company_id;

        console.log('Fetching contacts with params:', { 
            companyId, 
            searchTerm, 
            sortBy, 
            sortOrder,
            page,
            limit,
            hasFilters: filters.length > 0,
            deleted
        });

        // Função para remover acentos
        const removeAccents = (str) => {
            if (!str) return '';
            return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        };

        // Build base query - SEMPRE excluir deletados na busca de campanhas
        const query = { 
            company_id: companyId,
            deleted: { '$ne': true }
        };

        // Get all contacts first
        let contacts = await base44.entities.Contact.filter(query);

        console.log(`Found ${contacts.length} contacts before filtering`);

        // Load all tags to map IDs to names
        let tagMap = new Map();
        try {
            const allTags = await base44.entities.Tag.filter({ company_id: companyId });
            allTags.forEach(tag => {
                tagMap.set(tag.id, tag.name);
                tagMap.set(tag.name, tag.name); // Also map name to name for direct matches
            });
        } catch (error) {
            console.warn('Could not load tags:', error);
        }

        // Apply custom filters
        if (filters && filters.length > 0) {
            filters.forEach(filter => {
                const { field, operator, value } = filter;
                
                if (field === 'tags') {
                    if (operator === 'has_tag') {
                        contacts = contacts.filter(contact => {
                            const tags = contact.tags;
                            if (!tags || !Array.isArray(tags)) return false;
                            return tags.some(tag => {
                                // Tag can be ID or name
                                const tagName = tagMap.get(tag) || tag;
                                return tagName === value;
                            });
                        });
                    }
                } else if (field === 'tags_system') {
                    if (operator === 'has_tag') {
                        contacts = contacts.filter(contact => {
                            const systemTags = contact.tags_system;
                            if (!systemTags || !Array.isArray(systemTags)) return false;
                            return systemTags.some(tag => {
                                if (typeof tag === 'string') return tag === value;
                                if (tag && typeof tag === 'object') return tag.name === value || tag.id === value;
                                return false;
                            });
                        });
                    }
                } else if (field === 'deleted') {
                    if (operator === 'not_equals') {
                        contacts = contacts.filter(contact => !contact.deleted || contact.deleted !== true);
                    } else {
                        contacts = contacts.filter(contact => contact.deleted === (value === 'true' || value === true));
                    }
                } else if (field === 'gender') {
                    const genderMap = {
                        'Masculino': 'male',
                        'Feminino': 'female',
                        'Outro': 'other',
                        'Não Informado': 'not_informed'
                    };
                    const genderValue = genderMap[value] || value;
                    contacts = contacts.filter(contact => contact.gender === genderValue);
                } else {
                    if (operator === 'equals') {
                        contacts = contacts.filter(contact => contact[field] === value);
                    }
                }
            });
        }

        // Apply search term (com suporte a busca sem acentos)
        if (searchTerm && searchTerm.trim()) {
            const lowerSearch = searchTerm.toLowerCase().trim();
            const searchWithoutAccents = removeAccents(lowerSearch);
            
            contacts = contacts.filter(contact => {
                const firstName = (contact.first_name || '').toLowerCase();
                const lastName = (contact.last_name || '').toLowerCase();
                const fullName = `${firstName} ${lastName}`.trim();
                const email = (contact.email || '').toLowerCase();
                const phone = (contact.phone || '').toLowerCase();
                const company = (contact.company_name || '').toLowerCase();
                
                // Versões sem acento para comparação
                const firstNameNoAccent = removeAccents(firstName);
                const lastNameNoAccent = removeAccents(lastName);
                const fullNameNoAccent = removeAccents(fullName);
                const emailNoAccent = removeAccents(email);
                const companyNoAccent = removeAccents(company);
                
                // Buscar com ou sem acento, incluindo nome completo
                return firstName.includes(lowerSearch) ||
                       lastName.includes(lowerSearch) ||
                       fullName.includes(lowerSearch) ||
                       email.includes(lowerSearch) ||
                       phone.includes(lowerSearch) ||
                       company.includes(lowerSearch) ||
                       firstNameNoAccent.includes(searchWithoutAccents) ||
                       lastNameNoAccent.includes(searchWithoutAccents) ||
                       fullNameNoAccent.includes(searchWithoutAccents) ||
                       emailNoAccent.includes(searchWithoutAccents) ||
                       companyNoAccent.includes(searchWithoutAccents);
            });
        }

        // Apply campaign filters - buscar mensagens por schedule_id
        if (selectedCampaigns && selectedCampaigns.length > 0) {
            console.log(`🔍 Filtrando por campanhas:`, selectedCampaigns);
            
            // Buscar todas as mensagens das campanhas selecionadas
            const messages = await base44.entities.Message.filter({
                company_id: companyId,
                schedule_id: { '$in': selectedCampaigns }
            });
            
            console.log(`📨 Encontradas ${messages.length} mensagens das campanhas selecionadas`);
            
            // Extrair IDs únicos de contatos dessas mensagens
            const contactIdsInCampaigns = [...new Set(messages.map(m => m.contact_id))];
            
            console.log(`👥 ${contactIdsInCampaigns.length} contatos únicos encontrados nas campanhas`);
            
            // Filtrar contatos que estão nas campanhas
            contacts = contacts.filter(contact => contactIdsInCampaigns.includes(contact.id));
        }

        // Apply tag filters
        if (selectedTags && selectedTags.length > 0) {
            contacts = contacts.filter(contact => {
                if (!contact.tags || !Array.isArray(contact.tags)) return false;
                return selectedTags.some(selectedTag => 
                    contact.tags.some(tag => {
                        const tagName = tagMap.get(tag) || tag;
                        return tagName === selectedTag;
                    })
                );
            });
        }

        // Apply system tag filters
        if (selectedSystemTags && selectedSystemTags.length > 0) {
            console.log(`🔍 Filtrando por marcadores de sistema:`, selectedSystemTags);
            contacts = contacts.filter(contact => {
                if (!contact.tags_system || !Array.isArray(contact.tags_system)) return false;
                return selectedSystemTags.some(selectedSystemTagId => 
                    contact.tags_system.includes(selectedSystemTagId)
                );
            });
        }

        // Apply import name filters
        if (selectedImports && selectedImports.length > 0) {
            console.log(`🔍 Filtrando por importações:`, selectedImports);
            contacts = contacts.filter(contact => {
                return selectedImports.includes(contact.import_name);
            });
        }

        // Apply responsible filters
        if (selectedResponsibles && selectedResponsibles.length > 0) {
            console.log(`🔍 Filtrando por responsáveis:`, selectedResponsibles);
            contacts = contacts.filter(contact => {
                return selectedResponsibles.includes(contact.responsible_name);
            });
        }

        console.log(`${contacts.length} contacts after filtering`);

        // Sort contacts
        const sortField = sortBy === 'name' ? 'first_name' : sortBy;
        contacts.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];
            
            if (sortField === 'created_date' || sortField === 'updated_date') {
                aVal = new Date(aVal || 0);
                bVal = new Date(bVal || 0);
            } else if (typeof aVal === 'string') {
                aVal = (aVal || '').toLowerCase();
                bVal = (bVal || '').toLowerCase();
            }
            
            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        // Calculate pagination
        const totalContacts = contacts.length;
        const totalPages = Math.ceil(totalContacts / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedContacts = contacts.slice(startIndex, endIndex);

        console.log(`Returning ${paginatedContacts.length} contacts for page ${page}`);

        return Response.json({
            success: true,
            contacts: paginatedContacts,
            pagination: {
                currentPage: page,
                totalPages,
                totalContacts,
                limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        }, {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error('Get filtered contacts error:', error);
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