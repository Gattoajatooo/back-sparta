import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const startTime = Date.now();

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

        const { failed_contacts } = await req.json();

        if (!failed_contacts || !Array.isArray(failed_contacts) || failed_contacts.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No failed contacts provided'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`Retrying ${failed_contacts.length} failed contacts`);

        let successfulRetries = 0;
        let stillFailed = 0;
        const retryErrors = [];
        const successfulContacts = [];

        // Process each failed contact with delays
        for (const contactData of failed_contacts) {
            try {
                // Add delay between retries
                await new Promise(resolve => setTimeout(resolve, 800));

                const response = await base44.functions.invoke('createSingleContact', contactData);

                if (response.success) {
                    successfulRetries++;
                    successfulContacts.push(response.contact);
                    console.log(`✅ Retry successful: ${contactData.first_name}`);
                } else {
                    stillFailed++;
                    retryErrors.push({
                        contact: `${contactData.first_name} ${contactData.last_name || ''}`,
                        error: response.error,
                        attempts: response.attempts
                    });
                    console.log(`❌ Retry failed: ${contactData.first_name}`);
                }

            } catch (error) {
                stillFailed++;
                retryErrors.push({
                    contact: `${contactData.first_name} ${contactData.last_name || ''}`,
                    error: error.message || 'Function call error',
                    attempts: 0
                });
                console.error(`💥 Critical retry error:`, error.message);
            }
        }

        console.log(`Retry completed: ${successfulRetries} successful, ${stillFailed} still failed`);

        return new Response(JSON.stringify({
            success: true,
            retry_summary: {
                total_retried: failed_contacts.length,
                successful_retries: successfulRetries,
                still_failed: stillFailed,
                success_rate: Math.round((successfulRetries / failed_contacts.length) * 100)
            },
            successful_contacts: successfulContacts,
            remaining_errors: retryErrors,
            duration_ms: Date.now() - startTime
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error in retry failed contacts:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});