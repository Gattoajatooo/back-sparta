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

        const { cep } = await req.json();

        if (!cep) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'CEP é obrigatório' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Clean CEP (remove non-numeric characters)
        const cleanCEP = cep.replace(/\D/g, '');

        if (cleanCEP.length !== 8) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'CEP deve ter 8 dígitos' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Call ViaCEP API
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        
        if (!response.ok) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Erro ao consultar CEP' 
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();

        if (data.erro) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'CEP não encontrado' 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            data: {
                cep: data.cep,
                logradouro: data.logradouro,
                complemento: data.complemento,
                bairro: data.bairro,
                localidade: data.localidade,
                uf: data.uf,
                ibge: data.ibge,
                gia: data.gia,
                ddd: data.ddd,
                siafi: data.siafi
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error in lookupAddressByCep:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});