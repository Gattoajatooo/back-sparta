import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';
import * as XLSX from 'npm:xlsx@0.18.5';

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

        const { file_url, file_name } = await req.json();

        if (!file_url) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'file_url is required' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Download the file
        console.log('[parseUploadedFile] Downloading file from:', file_url);
        const fileResponse = await fetch(file_url);
        if (!fileResponse.ok) {
            console.error('[parseUploadedFile] Failed to download file. Status:', fileResponse.status);
            return new Response(JSON.stringify({
                success: false,
                error: `Failed to download file. HTTP Status: ${fileResponse.status}`
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const fileBuffer = await fileResponse.arrayBuffer();
        console.log('[parseUploadedFile] File downloaded successfully. Size:', fileBuffer.byteLength, 'bytes');
        const fileName = file_name?.toLowerCase() || '';
        
        let workbook;
        let headers = [];
        let rows = [];

        if (fileName.includes('.xlsx') || fileName.includes('.xls')) {
            // Parse Excel file
            console.log('[parseUploadedFile] Parsing Excel file...');
            workbook = XLSX.read(new Uint8Array(fileBuffer), { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            console.log('[parseUploadedFile] Sheet name:', sheetName);
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            console.log('[parseUploadedFile] Raw Excel data rows:', jsonData.length);
            
            if (jsonData.length > 0) {
                headers = jsonData[0].map(h => String(h || '').trim()).filter(h => h);
                rows = jsonData.slice(1).filter(row => 
                    row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
                );
                console.log('[parseUploadedFile] Parsed headers:', headers);
                console.log('[parseUploadedFile] Parsed data rows:', rows.length);
            }
        } else if (fileName.includes('.csv')) {
            // Parse CSV file
            console.log('[parseUploadedFile] Parsing CSV file...');
            const textContent = new TextDecoder('utf-8').decode(fileBuffer);
            const lines = textContent.split('\n').map(line => line.trim()).filter(line => line);
            console.log('[parseUploadedFile] CSV lines detected:', lines.length);
            
            if (lines.length > 0) {
                // Detect separator (comma, semicolon, or tab)
                const firstLine = lines[0];
                let separator = ',';
                if (firstLine.includes(';') && firstLine.split(';').length > firstLine.split(',').length) {
                    separator = ';';
                } else if (firstLine.includes('\t') && firstLine.split('\t').length > firstLine.split(',').length) {
                    separator = '\t';
                }
                console.log('[parseUploadedFile] Detected separator:', separator === '\t' ? 'TAB' : separator);

                // Parse headers
                headers = lines[0].split(separator)
                    .map(h => h.replace(/["']/g, '').trim())
                    .filter(h => h);
                console.log('[parseUploadedFile] Parsed headers:', headers);

                // Parse rows
                rows = lines.slice(1).map(line => {
                    const values = [];
                    let current = '';
                    let inQuotes = false;
                    
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"' || char === "'") {
                            inQuotes = !inQuotes;
                        } else if (char === separator && !inQuotes) {
                            values.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    values.push(current.trim());
                    return values;
                }).filter(row => 
                    row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
                );
                console.log('[parseUploadedFile] Parsed data rows:', rows.length);
            }
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: 'Unsupported file format. Only .xlsx, .xls, and .csv files are supported.'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Clean and format data
        const cleanRows = rows.map(row => {
            const cleanRow = {};
            headers.forEach((header, index) => {
                const value = row[index];
                cleanRow[header] = value !== null && value !== undefined ? String(value).trim() : '';
            });
            return cleanRow;
        });
        console.log('[parseUploadedFile] Clean rows created:', cleanRows.length);
        console.log('[parseUploadedFile] First clean row sample:', cleanRows[0]);

        // Auto-detect field mappings - VERSÃO EXPANDIDA E MELHORADA
        const autoMapping = {};
        headers.forEach(header => {
            const lowerHeader = header.toLowerCase().trim();
            
            // Basic Info
            if (lowerHeader.includes('nome') && !lowerHeader.includes('sobrenome') && !lowerHeader.includes('empresa') && !lowerHeader.includes('banco')) {
                autoMapping[header] = 'first_name';
            } else if (lowerHeader.includes('sobrenome') || lowerHeader.includes('ultimo nome') || lowerHeader.includes('último nome')) {
                autoMapping[header] = 'last_name';
            } else if (lowerHeader.includes('cpf') || lowerHeader.includes('cnpj') || lowerHeader.includes('documento')) {
                autoMapping[header] = 'document_number';
            } else if (lowerHeader.includes('genero') || lowerHeader.includes('gênero') || lowerHeader.includes('gender') || lowerHeader.includes('sexo')) {
                autoMapping[header] = 'gender';
            } else if (lowerHeader.includes('nascimento') || lowerHeader.includes('birth')) {
                autoMapping[header] = 'birth_date';
            } else if (lowerHeader.includes('responsavel') || lowerHeader.includes('responsável') || lowerHeader.includes('responsible')) {
                autoMapping[header] = 'responsible_name';
            } else if (lowerHeader.includes('valor') && (lowerHeader.includes('estimado') || lowerHeader.includes('estimated'))) {
                autoMapping[header] = 'value';
            }
            
            // Emails - VERIFICAR TIPOS PRIMEIRO!
            else if (lowerHeader.includes('tipo') && lowerHeader.includes('email') && lowerHeader.includes('principal')) {
                autoMapping[header] = 'email_type';
            } else if (lowerHeader.includes('tipo') && lowerHeader.includes('email') && lowerHeader.includes('2')) {
                autoMapping[header] = 'email_2_type';
            } else if (lowerHeader.includes('tipo') && lowerHeader.includes('email') && lowerHeader.includes('3')) {
                autoMapping[header] = 'email_3_type';
            } else if (lowerHeader.includes('tipo') && lowerHeader.includes('email') && lowerHeader.includes('4')) {
                autoMapping[header] = 'email_4_type';
            } else if (lowerHeader.includes('email') && lowerHeader.includes('principal')) {
                autoMapping[header] = 'email';
            } else if (lowerHeader.includes('email') && lowerHeader.includes('2')) {
                autoMapping[header] = 'email_2';
            } else if (lowerHeader.includes('email') && lowerHeader.includes('3')) {
                autoMapping[header] = 'email_3';
            } else if (lowerHeader.includes('email') && lowerHeader.includes('4')) {
                autoMapping[header] = 'email_4';
            } else if (lowerHeader.includes('email') && !lowerHeader.includes('2') && !lowerHeader.includes('3') && !lowerHeader.includes('4')) {
                autoMapping[header] = 'email';
            }
            
            // Phones - VERIFICAR TIPOS PRIMEIRO!
            else if (lowerHeader.includes('tipo') && lowerHeader.includes('telefone') && lowerHeader.includes('principal')) {
                autoMapping[header] = 'phone_type';
            } else if (lowerHeader.includes('tipo') && lowerHeader.includes('telefone') && lowerHeader.includes('2')) {
                autoMapping[header] = 'phone_2_type';
            } else if (lowerHeader.includes('tipo') && lowerHeader.includes('telefone') && lowerHeader.includes('3')) {
                autoMapping[header] = 'phone_3_type';
            } else if (lowerHeader.includes('tipo') && lowerHeader.includes('telefone') && lowerHeader.includes('4')) {
                autoMapping[header] = 'phone_4_type';
            } else if (lowerHeader.includes('telefone') && lowerHeader.includes('principal')) {
                autoMapping[header] = 'phone';
            } else if (lowerHeader.includes('telefone') && lowerHeader.includes('2')) {
                autoMapping[header] = 'phone_2';
            } else if (lowerHeader.includes('telefone') && lowerHeader.includes('3')) {
                autoMapping[header] = 'phone_3';
            } else if (lowerHeader.includes('telefone') && lowerHeader.includes('4')) {
                autoMapping[header] = 'phone_4';
            } else if (lowerHeader.includes('telefone') && !lowerHeader.includes('2') && !lowerHeader.includes('3') && !lowerHeader.includes('4')) {
                autoMapping[header] = 'phone';
            } else if (lowerHeader.includes('phone') && !lowerHeader.includes('2') && !lowerHeader.includes('3') && !lowerHeader.includes('4')) {
                autoMapping[header] = 'phone';
            }
            
            // Company Info
            else if (lowerHeader.includes('empresa') || lowerHeader.includes('company')) {
                autoMapping[header] = 'company_name';
            } else if (lowerHeader.includes('cargo') && !lowerHeader.includes('personalizado')) {
                autoMapping[header] = 'position';
            } else if (lowerHeader.includes('cargo') && lowerHeader.includes('personalizado')) {
                autoMapping[header] = 'custom_position';
            }
            
            // Address
            else if (lowerHeader.includes('tipo') && lowerHeader.includes('endereco')) {
                autoMapping[header] = 'address_type';
            } else if (lowerHeader.includes('cep') && !lowerHeader.includes('2')) {
                autoMapping[header] = 'cep';
            } else if (lowerHeader.includes('rua') || lowerHeader.includes('street') || lowerHeader.includes('logradouro')) {
                autoMapping[header] = 'street';
            } else if (lowerHeader.includes('numero') && !lowerHeader.includes('telefone') && !lowerHeader.includes('conta') && !lowerHeader.includes('2')) {
                autoMapping[header] = 'number';
            } else if (lowerHeader.includes('complemento')) {
                autoMapping[header] = 'complement';
            } else if (lowerHeader.includes('bairro') || lowerHeader.includes('neighborhood')) {
                autoMapping[header] = 'neighborhood';
            } else if (lowerHeader.includes('cidade') || lowerHeader.includes('city')) {
                autoMapping[header] = 'city';
            } else if (lowerHeader.includes('estado') || lowerHeader.includes('state') || lowerHeader.includes('uf')) {
                autoMapping[header] = 'state';
            } else if (lowerHeader.includes('pais') || lowerHeader.includes('país') || lowerHeader.includes('country')) {
                autoMapping[header] = 'country';
            }
            
            // Status and Source
            else if (lowerHeader.includes('status') && lowerHeader.includes('contato')) {
                autoMapping[header] = 'status';
            } else if (lowerHeader.includes('origem') || lowerHeader.includes('source') || lowerHeader.includes('fonte')) {
                autoMapping[header] = 'source';
            }
            
            // Social Profiles
            else if (lowerHeader.includes('linkedin')) {
                autoMapping[header] = 'linkedin';
            } else if (lowerHeader.includes('facebook')) {
                autoMapping[header] = 'facebook';
            } else if (lowerHeader.includes('instagram')) {
                autoMapping[header] = 'instagram';
            } else if (lowerHeader.includes('twitter')) {
                autoMapping[header] = 'twitter';
            } else if (lowerHeader.includes('website') || lowerHeader.includes('site')) {
                autoMapping[header] = 'website';
            }
            
            // Banking Data
            else if (lowerHeader.includes('nome') && lowerHeader.includes('banco')) {
                autoMapping[header] = 'bank_name';
            } else if (lowerHeader.includes('codigo') && lowerHeader.includes('banco')) {
                autoMapping[header] = 'bank_code';
            } else if (lowerHeader.includes('agencia') || lowerHeader.includes('agência')) {
                autoMapping[header] = 'agency';
            } else if (lowerHeader.includes('conta') && !lowerHeader.includes('digito') && !lowerHeader.includes('dígito')) {
                autoMapping[header] = 'account';
            } else if (lowerHeader.includes('digito') && lowerHeader.includes('conta')) {
                autoMapping[header] = 'account_digit';
            } else if (lowerHeader.includes('tipo') && lowerHeader.includes('pix')) {
                autoMapping[header] = 'pix_key_type';
            } else if (lowerHeader.includes('chave') && lowerHeader.includes('pix')) {
                autoMapping[header] = 'pix_key';
            }
            
            // Additional
            else if (lowerHeader.includes('observa') || lowerHeader.includes('notes') || lowerHeader.includes('nota')) {
                autoMapping[header] = 'notes';
            } else if (lowerHeader.includes('tags') || lowerHeader.includes('marcador')) {
                autoMapping[header] = 'tags';
            }
            
            // Fallback - não mapear
            else {
                autoMapping[header] = 'skip';
            }
        });

        console.log('[parseUploadedFile] ✅ Parse completed successfully');
        console.log('[parseUploadedFile] Headers:', headers.length);
        console.log('[parseUploadedFile] Total rows:', cleanRows.length);
        console.log('[parseUploadedFile] Auto-mapping applied:', Object.keys(autoMapping).length, 'fields');

        return new Response(JSON.stringify({
            success: true,
            data: {
                headers,
                rows: cleanRows,
                total_rows: cleanRows.length,
                auto_mapping: autoMapping,
                preview_data: cleanRows.slice(0, 10) // Show first 10 rows for preview
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[parseUploadedFile] ❌ Parse uploaded file error:', error);
        console.error('[parseUploadedFile] Error stack:', error.stack);
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error',
            details: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});