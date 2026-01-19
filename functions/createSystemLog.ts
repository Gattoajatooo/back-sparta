import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    const startTime = Date.now();

    try {
        const base44 = createClientFromRequest(req);

        // Get current user
        let user = null;
        try {
            user = await base44.auth.me();
        } catch (authError) {
            console.error('Authentication error in createSystemLog:', authError.message);
            // Continue without user for certain system operations
        }

        const logData = await req.json();
        console.log('createSystemLog called with data:', {
            company_id: logData.company_id,
            user_id: logData.user_id,
            action: logData.action,
            resource_type: logData.resource_type,
            status: logData.status,
            hasRequestData: !!logData.request_data,
            hasResponseData: !!logData.response_data
        });

        // Validate required fields based on SystemLog entity schema
        const requiredFields = ['company_id', 'user_id', 'action', 'resource_type', 'status'];
        const missingFields = requiredFields.filter(field => !logData[field]);
        
        if (missingFields.length > 0) {
            console.error('Missing required fields for SystemLog:', missingFields);
            return new Response(JSON.stringify({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Ensure company_id and user_id are strings, not objects
        const cleanCompanyId = typeof logData.company_id === 'object' ? String(logData.company_id) : logData.company_id;
        const cleanUserId = typeof logData.user_id === 'object' ? String(logData.user_id) : logData.user_id;

        // Prepare log entry with all available data
        const logEntry = {
            company_id: cleanCompanyId,
            user_id: cleanUserId,
            action: String(logData.action),
            resource_type: String(logData.resource_type),
            resource_id: logData.resource_id ? String(logData.resource_id) : null,
            status: String(logData.status),
            method: logData.method ? String(logData.method) : null,
            endpoint: logData.endpoint ? String(logData.endpoint) : null,
            request_data: logData.request_data || null,
            response_data: logData.response_data || null,
            error_message: logData.error_message ? String(logData.error_message) : null,
            error_stack: logData.error_stack ? String(logData.error_stack) : null,
            ip_address: logData.ip_address || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
            user_agent: logData.user_agent || req.headers.get('user-agent') || null,
            duration_ms: logData.duration_ms || (Date.now() - startTime),
            metadata: logData.metadata || null
        };

        console.log('Attempting to create SystemLog entry with:', {
            company_id: logEntry.company_id,
            user_id: logEntry.user_id,
            action: logEntry.action,
            resource_type: logEntry.resource_type,
            status: logEntry.status
        });

        // Create the system log entry
        let result;
        try {
            result = await base44.asServiceRole.entities.SystemLog.create(logEntry);
            console.log('SystemLog created successfully with ID:', result?.id);
        } catch (createError) {
            console.error('Error creating SystemLog entry:', createError);
            
            // Try with minimal data if the full entry fails
            const minimalLogEntry = {
                company_id: cleanCompanyId,
                user_id: cleanUserId,
                action: String(logData.action),
                resource_type: String(logData.resource_type),
                status: String(logData.status)
            };

            console.log('Retrying with minimal log entry:', minimalLogEntry);
            
            try {
                result = await base44.asServiceRole.entities.SystemLog.create(minimalLogEntry);
                console.log('Minimal SystemLog created successfully with ID:', result?.id);
            } catch (minimalError) {
                console.error('Even minimal SystemLog creation failed:', minimalError);
                throw minimalError;
            }
        }

        return new Response(JSON.stringify({
            success: true,
            log_id: result?.id,
            message: 'System log created successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('createSystemLog function error:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create log entry',
            details: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});