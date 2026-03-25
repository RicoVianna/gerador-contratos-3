'use strict';

// ---- PWA: register service worker ----
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

// ---- Helpers ----
function byId(id) {
    return document.getElementById(id);
}

// ---- Monta endereço completo a partir dos campos separados ----
function montarEndereco(d, prefix) {
    const cep = d[prefix + '_cep'] || '';
    const rua = d[prefix + '_rua'] || '';
    const numero = d[prefix + '_numero'] || '';
    const bairro = d[prefix + '_bairro'] || '';
    const cidade = d[prefix + '_cidade'] || '';
    const estado = d[prefix + '_estado'] || '';

    let endereco = '';

    if (rua) endereco += rua;
    if (numero) endereco += `, ${numero}`;
    if (bairro) endereco += `, ${bairro}`;
    if (cidade && estado) endereco += `, ${cidade}/${estado}`;
    if (cep) endereco += ` — CEP ${cep}`;

    return endereco ? escapeHtml(endereco) : '—';
}

function extenseValue(str) {
    return str ? `R$ ${str}` : '—';
}

function gerarTextoPagamento(d) {
    const valorTotal = d.valor || '—';
    const forma = d.forma_pagamento; 
    const entrada = d.valor_entrada || '0,00';
    const qtd = d.qtd_parcelas || '1';
    const tipoParcela = d.tipo_parcelamento;
    
    // Puxa o valor calculado que aparece na tela (ex: R$ 333,33)
    const valorCadaParcela = d.valor_calculado_parcela || '—';

    if (forma === 'parcelado') {
        const dataPrimeira = d.data_primeira_parcela || '';
        const dataTexto = dataPrimeira 
            ? `, com vencimento da primeira parcela em <strong>${formatDate(dataPrimeira)}</strong> e as demais a cada 30 dias`
            : '';
        if (tipoParcela === 'com_entrada') {
            return `o valor total de <strong>R$ ${valorTotal}</strong>, sendo uma <strong>entrada de R$ ${entrada}</strong> e o saldo restante dividido em <strong>${qtd} parcelas de ${valorCadaParcela}</strong>${dataTexto}.`;
        } else {
            return `o valor total de <strong>R$ ${valorTotal}</strong>, dividido em <strong>${qtd} parcelas de ${valorCadaParcela}</strong>${dataTexto}.`;
        }
    }
    
    if (forma === 'aprazo') {
        // Criamos a variável de data apenas aqui dentro
        // IMPORTANTE: Verifique se o ID no seu HTML é 'data_cheque'
        const dataPagamento = d.data_cheque || d.data_pagamento || '';
        const dataTexto = dataPagamento ? `, com vencimento programado para o dia <strong>${formatDate(dataPagamento)}</strong>` : '';
        
        return `o valor total de <strong>R$ ${valorTotal}</strong>, a ser pago integralmente em parcela única${dataTexto}.`;
    }

    return `o valor total de <strong>R$ ${valorTotal}</strong>, pago à vista.`;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    const months = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return `${parseInt(d, 10)} de ${months[parseInt(m, 10) - 1]} de ${y}`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

function val(d, key, fallback) {
    return (d[key] && d[key].trim()) ? escapeHtml(d[key]) : (fallback || '—');
}

function temConteudo(valor) {
    return valor && valor.trim() !== '';
}

// ---- Build qualificação completa ----
function buildQualificacao(d, prefix, papel) {
    const nome = val(d, prefix + '_nome');
    const cpf = val(d, prefix + '_cpf');
    const rg = d[prefix + '_rg'] ? d[prefix + '_rg'].trim() : '';
    const nac = d[prefix + '_nacionalidade'] ? d[prefix + '_nacionalidade'].trim() : '';
    const prof = d[prefix + '_profissao'] ? d[prefix + '_profissao'].trim() : '';
    const civil = d[prefix + '_estado_civil'] ? d[prefix + '_estado_civil'].trim() : '';
    const endereco = montarEndereco(d, prefix);

    const attrs = [];
    if (nac) attrs.push(nac);
    if (prof) attrs.push(prof);
    if (civil) attrs.push(civil);
    if (rg) attrs.push(`portador(a) do RG nº ${escapeHtml(rg)}`);
    attrs.push(`inscrito(a) no CPF/CNPJ sob o nº <strong>${cpf}</strong>`);
    attrs.push(`residente e domiciliado(a) à ${endereco}`);

    return `<strong>${nome}</strong>, ${attrs.join(', ')}, doravante denominado(a) simplesmente <strong>"${papel}"</strong>`;
}

// ---- Form Validation ----
function validateForm(form) {
    let valid = true;
    form.querySelectorAll('[required]').forEach(el => {
        if (el.offsetParent === null) return; // skip hidden fields
        if (!el.value.trim()) {
            el.classList.add('invalid');
            valid = false;
        } else {
            el.classList.remove('invalid');
        }
    });
    return valid;
}

// ================================================================
// CONTRACT GENERATOR: PRESTAÇÃO DE SERVIÇOS
// ================================================================
function buildPrestacaoServicos(d) {
    const qualContratante = buildQualificacao(d, 'contratante', 'CONTRATANTE');
    const qualContratado = buildQualificacao(d, 'contratado', 'CONTRATADO');
    const n = temConteudo(d.clausulas) ? 9 : 8;/* 01 */
    return `
        <h1>Contrato de Prestação de Serviços</h1>

        <div class="contract-intro">
            <p>As partes abaixo qualificadas celebram entre si o presente <strong>Contrato de Prestação de Serviços</strong>,
            que se regerá pelas cláusulas e condições a seguir estipuladas, em conformidade com o Código Civil Brasileiro
            (Lei nº 10.406/2002) e demais legislações aplicáveis:</p>
        </div>

        <div class="meta-block">
            <p class="meta-label">Das Partes</p>
            <p style="margin-bottom:.8rem"><strong>CONTRATANTE:</strong> ${qualContratante}.</p>
            <p><strong>CONTRATADO:</strong> ${qualContratado}.</p>
        </div>

        <div class="clause">
            <p class="clause-title">Cláusula 1ª — Do Objeto</p>
            <p>O presente instrumento tem por objeto a prestação dos seguintes serviços pelo CONTRATADO ao CONTRATANTE:</p>
            <p class="clause-body-block">${escapeHtml(d.objeto || '')}</p>
            <p>Os serviços deverão ser executados de acordo com as especificações acordadas entre as partes, com qualidade
            técnica compatível com o estado da arte da área de atuação do CONTRATADO.</p>
        </div>

        <div class="clause">
            <p class="clause-title">Cláusula 2ª — Do Prazo de Execução</p>
            <p>O prazo para execução e entrega do objeto deste contrato é de <strong>${val(d, 'prazo')}</strong>, contados
            a partir da data de assinatura deste instrumento. O prazo poderá ser prorrogado, por período equivalente,
            mediante acordo escrito entre as partes, desde que justificado por motivo de força maior ou por solicitação
            fundamentada do CONTRATANTE.</p>
        </div>

        <div class="clause">
            <p class="clause-title">Cláusula 3ª — Do Valor e da Forma de Pagamento</p>
            <p>Pela prestação dos serviços ora contratados, o CONTRATANTE pagará ao CONTRATADO ${gerarTextoPagamento(d)}</p>
            ${d.condicoes && d.condicoes.trim() ? `<p>Condições: ${escapeHtml(d.condicoes)}.</p>` : ''}
            <p>O não pagamento nos prazos acordados sujeitará o CONTRATANTE à multa moratória de 2% (dois por cento)
            sobre o valor em aberto, acrescida de juros de 1% (um por cento) ao mês e correção monetária pelo IGPM/FGV.</p>
        </div>

        <div class="clause">
            <p class="clause-title">Cláusula 4ª — Das Obrigações do Contratante</p>
            <p>São obrigações do CONTRATANTE:</p>
            <p>(i) efetuar os pagamentos nos prazos e condições estipulados neste instrumento;</p>
            <p>(ii) fornecer ao CONTRATADO, em tempo hábil, todas as informações, materiais, credenciais de acesso e
            demais insumos necessários à execução dos serviços;</p>
            <p>(iii) comunicar ao CONTRATADO, de forma imediata e por escrito, quaisquer irregularidades ou
            insatisfações detectadas durante a prestação dos serviços;</p>
            <p>(iv) aprovar, por escrito, as entregas parciais ou definitivas em prazo razoável, sob pena de se
            considerar tacitamente aceitas após 5 (cinco) dias úteis da apresentação.</p>
        </div>

        <div class="clause">
            <p class="clause-title">Cláusula 5ª — Das Obrigações do Contratado</p>
            <p>São obrigações do CONTRATADO:</p>
            <p>(i) executar os serviços com diligência, competência técnica e dentro do prazo acordado;</p>
            <p>(ii) manter absoluto sigilo sobre todas as informações confidenciais obtidas em razão deste contrato,
            durante sua vigência e por 2 (dois) anos após seu encerramento;</p>
            <p>(iii) comunicar prontamente ao CONTRATANTE qualquer impedimento técnico ou circunstância que possa
            comprometer o cumprimento do prazo ou da qualidade dos serviços;</p>
            <p>(iv) responsabilizar-se pelos impostos, contribuições previdenciárias e demais encargos decorrentes
            de sua atividade profissional autônoma.</p>
        </div>

        <div class="clause">
            <p class="clause-title">Cláusula 6ª — Da Propriedade Intelectual</p>
            <p>Todo e qualquer produto intelectual criado pelo CONTRATADO no âmbito deste contrato — incluindo, mas não
            se limitando a, documentos, códigos-fonte, artes, relatórios e demais materiais — será de propriedade
            exclusiva do CONTRATANTE após a quitação integral do valor contratado, salvo disposição em contrário
            estabelecida por escrito pelas partes.</p>
        </div>

        <div class="clause">
            <p class="clause-title">Cláusula 7ª — Da Rescisão</p>
            <p>O presente contrato poderá ser rescindido por qualquer das partes mediante notificação prévia por
            escrito com antecedência mínima de 15 (quinze) dias. Em caso de rescisão sem justa causa pelo
            CONTRATANTE, será devida ao CONTRATADO a remuneração proporcional aos serviços já executados,
            acrescida de multa de 20% (vinte por cento) sobre o valor total remanescente. Em caso de
            inadimplemento pelo CONTRATADO, poderá o CONTRATANTE exigir restituição dos valores pagos
            antecipadamente, além de perdas e danos.</p>
        </div>

        ${temConteudo(d.clausulas) ? `
        <div class="clause">
            <p class="clause-title">Cláusula 8ª — Disposições Adicionais</p>
            <p>${escapeHtml(d.clausulas)}</p>
        </div>` : ''}

        <div class="clause">
            <p class="clause-title">Cláusula ${n}ª — Do Foro</p>
            <p>As partes elegem, de comum acordo, o foro da Comarca de <strong>${val(d, 'local')}</strong> para dirimir
            quaisquer dúvidas, controvérsias ou litígios decorrentes do presente contrato, com renúncia expressa
            a qualquer outro foro, por mais privilegiado que seja.</p>
        </div>

        <p class="contract-place-date">${val(d, 'local')}, ${formatDate(d.data)}.</p>

        ${buildSignatures(d, 'CONTRATANTE', 'CONTRATADO', 'contratante', 'contratado')}
    `;
}

// ================================================================
// CONTRACT GENERATOR: COMPRA E VENDA
// ================================================================
function buildCompraVenda(d) {
    const qualComprador = buildQualificacao(d, 'contratante', 'COMPRADOR');
    const qualVendedor = buildQualificacao(d, 'contratado', 'VENDEDOR');
    const n = temConteudo(d.clausulas) ? 9 : 8;

    const estadoBem = d.estado_bem ? d.estado_bem.trim() : '';
    const localEntrega = d.local_entrega && d.local_entrega.trim() ? d.local_entrega.trim() : val(d, 'local');

    return `
        <h1>Contrato de Compra e Venda</h1>

        <div class="contract-intro">
            <p>As partes abaixo qualificadas celebram entre si o presente <strong>Contrato de Compra e Venda</strong>,
            que se regerá pelas cláusulas e condições a seguir estipuladas, em conformidade com os arts. 481 a 532
            do Código Civil Brasileiro (Lei nº 10.406/2002) e demais legislações aplicáveis:</p>
        </div>

        <div class="meta-block">
            <p class="meta-label">Das Partes</p>
            <p style="margin-bottom:.8rem"><strong>VENDEDOR:</strong> ${qualVendedor}.</p>
            <p><strong>COMPRADOR:</strong> ${qualComprador}.</p>
        </div>

        <div class="clause">
            <p class="clause-title">Cláusula 1ª — Do Objeto</p>
            <p>O VENDEDOR vende ao COMPRADOR, em caráter definitivo e irrevogável, o bem a seguir descrito:</p>
            <p class="clause-body-block">${escapeHtml(d.bem_descricao || d.objeto || '')}</p>
            ${estadoBem ? `<p>Estado de conservação do bem: <strong>${escapeHtml(estadoBem)}</strong>.</p>` : ''}
            <p>O VENDEDOR declara que o bem objeto deste contrato encontra-se livre e desembaraçado de quaisquer
            ônus, dívidas, hipotecas, penhoras ou outros gravames que possam comprometer a presente transação.</p>
        </div>

        <div class="clause">
            <p class="clause-title">Cláusula 2ª — Da Entrega e Transferência de Posse</p>
            <p>A entrega física do bem ao COMPRADOR ocorrerá no prazo de <strong>${val(d, 'prazo')}</strong> a contar
            da data de assinatura deste instrumento (ou da confirmação do pagamento, se posterior), no local:
            <strong>${escapeHtml(localEntrega)}</strong>.</p>
            <p>A transferência da posse e dos riscos sobre o bem opera-se no ato da entrega, a partir do qual o
            COMPRADOR responde por qualquer dano, perda ou deterioração que venha a ocorrer.</p>
        </div>

        <div class="clause">
            <p class="clause-title">Cláusula 3ª — Do Preço e da Forma de Pagamento</p>
            <p>Pela aquisição do bem objeto deste contrato, o COMPRADOR pagará ao VENDEDOR ${gerarTextoPagamento(d)}</p>
            ${d.condicoes && d.condicoes.trim() ? `<p>Condições: ${escapeHtml(d.condicoes)}.</p>` : ''}
            <p>O não pagamento nos prazos acordados sujeitará o COMPRADOR à multa moratória de 2% (dois por cento)
            sobre o valor em aberto, acrescida de juros de 1% (um por cento) ao mês e correção monetária pelo IGPM/FGV.</p>
        </div>

        <div class="clause">
            <p class="clause-title">Cláusula 4ª — Da Transferência de Propriedade</p>
            <p>A transferência definitiva da propriedade do bem ao COMPRADOR operar-se-á:</p>
            <p>(i) para bens móveis: no ato da tradição (entrega física) acompanhada do recibo de quitação;</p>
            <p>(ii) para bens imóveis: mediante registro do instrumento no Cartório de Registro de Imóveis
            competente, após o pagamento integral do preço;</p>
            <p>(iii) para veículos: com a transferência do documento de propriedade perante o DETRAN competente.</p>
            <p>As despesas relativas à transferência de propriedade, incluindo taxas, impostos e emolumentos,
            correrão por conta do COMPRADOR, salvo disposição diversa acordada por escrito.</p>
        </div>

        <div class="clause">
            <p class="clause-title">Cláusula 5ª — Das Garantias e Vícios</p>
            <p>O VENDEDOR responde pelos vícios ocultos do bem que o tornem impróprio ao uso a que se destina
            ou que lhe diminuam o valor, nos termos dos arts. 441 a 446 do Código Civil. O COMPRADOR terá o
            prazo legal para reclamar dos vícios aparentes (30 dias para bens móveis e 1 ano para imóveis),
            contados da entrega.</p>
            ${estadoBem && estadoBem !== 'Novo' ? `<p>Tendo em vista que o bem se encontra em estado <strong>${escapeHtml(estadoBem)}</strong>,
            o COMPRADOR declara ter tomado plena ciência das condições atuais do bem, conforme vistoria prévia
            realizada antes da assinatura deste instrumento.</p>` : ''}
        </div>

        <div class="clause">
            <p class="clause-title">Cláusula 6ª — Do Inadimplemento</p>
            <p>O não pagamento pelo COMPRADOR, no prazo e condições estipulados, sujeitará as partes às seguintes
            penalidades: multa de 10% (dez por cento) sobre o valor total do contrato, acrescida de juros
            moratórios de 1% (um por cento) ao mês e correção monetária pelo IGPM/FGV. O VENDEDOR poderá,
            ainda, considerar rescindido o contrato e exigir a devolução do bem, se já entregue, mediante
            notificação por escrito.</p>
        </div>

        <div class="clause">
            <p class="clause-title">Cláusula 7ª — Da Rescisão</p>
            <p>O presente contrato poderá ser rescindido de pleno direito, independentemente de notificação
            judicial ou extrajudicial, em caso de: (i) inadimplemento de qualquer obrigação por qualquer
            das partes; (ii) decretação de falência ou insolvência de qualquer das partes; (iii) vícios
            insanáveis no bem que impossibilitem sua regular transferência. A rescisão não prejudica o
            direito da parte inocente à indenização por perdas e danos.</p>
        </div>

        ${temConteudo(d.clausulas) ? `
        <div class="clause">
            <p class="clause-title">Cláusula 8ª — Disposições Adicionais</p>
            <p>${escapeHtml(d.clausulas)}</p>
        </div>` : ''}

        <div class="clause">
            <p class="clause-title">Cláusula ${n}ª — Do Foro</p>
            <p>As partes elegem, de comum acordo, o foro da Comarca de <strong>${val(d, 'local')}</strong> para dirimir
            quaisquer dúvidas, controvérsias ou litígios decorrentes do presente contrato, com renúncia expressa
            a qualquer outro foro, por mais privilegiado que seja.</p>
        </div>

        <p class="contract-place-date">${val(d, 'local')}, ${formatDate(d.data)}.</p>

        ${buildSignatures(d, 'COMPRADOR', 'VENDEDOR', 'contratante', 'contratado')}
    `;
}

// ---- Shared signatures block ----
function buildSignatures(d, roleA, roleB, prefixA, prefixB) {
    const nomeA = d[prefixA + '_nome'] || "___________________________";
    const nomeB = d[prefixB + '_nome'] || "___________________________";

    return `
        <div class="signatures-wrapper">
            <div class="sig-line-container">
                <div class="sig-line"></div>
                <div class="sig-name">${nomeA}</div>
                <div class="sig-role">${roleA}</div>
            </div>

            <div class="sig-line-container">
                <div class="sig-line"></div>
                <div class="sig-name">${nomeB}</div>
                <div class="sig-role">${roleB}</div>
            </div>

            <div style="margin-top: 20px;">
                <p><strong>Testemunhas:</strong></p>
                <div style="display: flex; justify-content: space-between; margin-top: 40px;">
                    <div style="width: 45%; text-align: center;">
                        <div style="border-top: 1px solid #000; margin-bottom: 5px;"></div>
                        <p style="font-size: 0.8rem;">Nome e CPF</p>
                    </div>
                    <div style="width: 45%; text-align: center;">
                        <div style="border-top: 1px solid #000; margin-bottom: 5px;"></div>
                        <p style="font-size: 0.8rem;">Nome e CPF</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ---- Route to correct generator ----
function buildContractHTML(d) {
    if (d.tipo_contrato === 'compravenda') return buildCompraVenda(d);
    return buildPrestacaoServicos(d);
}

function collectData(form) {
    const fd = new FormData(form);
    const d = {};
    for (const [k, v] of fd.entries()) {
        d[k] = (typeof v === 'string') ? v.trim() : v;
    }
    // Captura o valor calculado da parcela (vem do input readonly)
    const parcelaEl = document.getElementById('valor_calculado_parcela');
    if (parcelaEl) {
        d.valor_calculado_parcela = parcelaEl.value;
    }
    return d;
}

function enviarWhatsappPDF() {
    const element = document.getElementById('contractOutput');
    
    const opt = {
        margin: [10, 10, 10, 10], // Margens fixas (topo, esquerda, fundo, direita)
        filename: 'contrato.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            scrollY: 0 // Força o início da captura no topo do elemento
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // O modo 'avoid-all' abaixo evita que o PDF corte frases ao meio entre as páginas
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // 1. Gera e baixa o arquivo
    html2pdf().set(opt).from(element).save().then(() => {
        // 2. Abre o WhatsApp com a mensagem de orientação
        const texto = encodeURIComponent("Olá! Segue o contrato em PDF. (Anexe o arquivo 'contrato.pdf' que acabou de ser baixado)");
        const url = `https://api.whatsapp.com/send?text=${texto}`;
        
        window.open(url, '_blank');
    });
}

// ... fim da função buildContractHTML ou collectData ...

// ================================================================
// DOM REFERENCES
// ================================================================
const form = byId('contractForm');
const previewSection = byId('previewSection');
const contractOutput = byId('contractOutput');
const printBtn = byId('printBtn');
const editBtn = byId('editBtn');
const resetBtn = byId('resetBtn');
const tipoSelect = byId('tipo_contrato');
const tipoIcon = byId('tipoIcon');

// Labels that change based on tipo
const legendA = byId('legendA');
const legendB = byId('legendB');
const labelSecao2 = byId('labelSecao2');
const labelPrazo = byId('labelPrazo');
const labelObjeto = byId('labelObjeto');
const wrapObjeto = byId('wrapObjeto');
const wrapBem = byId('wrapBem');
const wrapBemEstado = byId('wrapBemEstado');
const bemDescricao = byId('bem_descricao');
const estadoBem = byId('estado_bem');
const objetoField = byId('objeto');

// ---- Apply tipo switching ----
function applyTipo(tipo) {
    if (!tipo) {
        tipoIcon.textContent = '⚙️';
        return; 
    }

    const isCV = tipo === 'compravenda';
    tipoIcon.textContent = '📄';

    legendA.textContent = isCV ? 'Comprador' : 'Contratante';
    legendB.textContent = isCV ? 'Vendedor' : 'Contratado';
    labelSecao2.textContent = isCV ? 'Bem e Valores' : 'Objeto e Valores';
    labelPrazo.textContent = isCV ? 'Prazo para entrega do bem *' : 'Prazo de execução / vigência *';

    if (isCV) {
        wrapObjeto.style.display = 'none';
        
        // ESTA LINHA É A ÚNICA QUE IMPORTA:
        // Ela força o display e o espaço de 35px no topo
        wrapBem.classList.add('ativo');
        
        wrapBemEstado.style.display = '';
        objetoField.removeAttribute('required');
        bemDescricao.setAttribute('required', '');
        estadoBem.setAttribute('required', '');
    } else {
        wrapObjeto.style.display = '';
        
        // Quando volta para serviços, removemos o espaço extra
        wrapBem.classList.remove('ativo');
        
        wrapBemEstado.style.display = 'none';
        objetoField.setAttribute('required', '');
        bemDescricao.removeAttribute('required');
        estadoBem.removeAttribute('required');
    }
}
tipoSelect.addEventListener('change', () => applyTipo(tipoSelect.value));

// Set today's date as default
const dataInput = byId('data');
if (dataInput && !dataInput.value) {
    const today = new Date();
    dataInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

const dataPrimeiraParcela = byId('data_primeira_parcela');
if (dataPrimeiraParcela && !dataPrimeiraParcela.value) {
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 30); // padrão: 30 dias
    dataPrimeiraParcela.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
}

// Initial state
applyTipo(tipoSelect.value);

// Remove invalid class on input
form.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('input', () => el.classList.remove('invalid'));
    el.addEventListener('change', () => el.classList.remove('invalid'));
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm(form)) {
        const firstInvalid = form.querySelector('.invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
    }
    const data = collectData(form);
    contractOutput.innerHTML = buildContractHTML(data);
    previewSection.hidden = false;
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

printBtn.addEventListener('click', () => window.print());

editBtn.addEventListener('click', () => {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Ativando o botão de WhatsApp
const whatsappBtn = byId('whatsappBtn');
if (whatsappBtn) {
    whatsappBtn.addEventListener('click', enviarWhatsappPDF);
}

// ---- Fill test data (VERSÃO CORRIGIDA) ----
const fillTestBtn = byId('fillTestBtn');
    if (fillTestBtn) {
    fillTestBtn.addEventListener('click', () => {
    const tipo = tipoSelect.value;
    const isCV = tipo === 'compravenda';
    
    const set = (id, v) => { 
        const el = byId(id); 
        if (el) {
            el.value = v;
            // Dispara evento para validar máscaras e cálculos
            el.dispatchEvent(new Event('input'));
            el.dispatchEvent(new Event('change'));
        }
    };
    
    const setSelect = (id, v) => {
        const el = byId(id);
        if (!el) return;
        for (const opt of el.options) {
            if (opt.value === v) {
                opt.selected = true;
                el.dispatchEvent(new Event('change'));
                break;
            }
        }
    };

    // --- Parte A (Contratante / Comprador) ---
    set('contratante_nome', isCV ? 'Carlos Eduardo Mendes' : 'TechStar Soluções Ltda.');
    set('contratante_nacionalidade', 'brasileiro(a)');
    set('contratante_profissao', isCV ? 'Empresário' : 'Tecnologia'); // Preenche Profissão
    setSelect('contratante_estado_civil', isCV ? 'casado(a)' : 'solteiro(a)'); // Preenche Estado Civil
    set('contratante_rg', '18.543.291-4'); // Preenche RG
    set('contratante_cpf', isCV ? '321.654.987-00' : '12.345.678/0001-90');
    
    // Endereço Parte A (Resolvendo CEP e Número)
    set('contratante_cep', '01310-100'); // Preenche CEP
    // Simula o preenchimento manual dos campos que o autocomplete traria
    set('contratante_rua', 'Avenida Paulista');
    set('contratante_bairro', 'Bela Vista');
    set('contratante_cidade', 'São Paulo');
    set('contratante_estado', 'SP');
    set('contratante_numero', '1000'); // Preenche Número

    // --- Parte B (Contratado / Vendedor) ---
    set('contratado_nome', isCV ? 'Ana Paula Ferreira' : 'João da Silva');
    set('contratado_nacionalidade', 'brasileiro(a)');
    set('contratado_profissao', isCV ? 'Professora' : 'Desenvolvedor Web');
    setSelect('contratado_estado_civil', 'solteiro(a)');
    set('contratado_rg', isCV ? '24.198.763-0' : '35.792.461-8');
    set('contratado_cpf', isCV ? '456.789.123-00' : '987.654.321-00');
    
    // Endereço Parte B
    set('contratado_cep', '22460-040'); // Preenche CEP
    set('contratado_rua', 'Rua das Flores');
    set('contratado_bairro', 'Jardim Botânico');
    set('contratado_cidade', 'Rio de Janeiro');
    set('contratado_estado', 'RJ');
    set('contratado_numero', '256'); // Preenche Número

    // --- Seção 2 e Restante ---
    if (isCV) {
        set('bem_descricao', 'Apartamento residencial com 80m², 2 dormitórios...');
        setSelect('estado_bem', 'Seminovo');
        set('local_entrega', 'No próprio imóvel, São Paulo/SP');
    } else {
        set('objeto', 'Desenvolvimento de sistema web completo...');
    }
    
    set('valor', '8.500,00');
    setSelect('forma_pagamento', 'avista'); // Exemplo simples para teste
    set('prazo', isCV ? '60 dias corridos' : '45 dias corridos');
    set('local', 'São Paulo/SP');

    // Limpa bordas vermelhas de erro
    form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
});
}

// ---- Busca endereço pelo CEP (ViaCEP) ----
resetBtn.addEventListener('click', () => {
    form.reset();
    previewSection.hidden = true;
    form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    const today = new Date();
    dataInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    applyTipo(tipoSelect.value);
});

// ---- CEP MASK (00000-000) ----
function applyCepMask(input) {
    input.addEventListener('input', () => {
        let v = input.value.replace(/\D/g, '');
        if (v.length > 5) {
            v = v.slice(0, 5) + '-' + v.slice(5, 8);
        }
        input.value = v;
    });
}
// aplicar máscara
const cepContratante = byId('contratante_cep');
const cepContratado = byId('contratado_cep');

if (cepContratante) applyCepMask(cepContratante);
if (cepContratado) applyCepMask(cepContratado);

// ---- BUSCAR CEP VIA API ----
// --- 1. BUSCAR ENDEREÇO VIA API (VIACEP) ---
async function buscarCep(cep, prefixo) {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await res.json();
        if (data.erro) return;

        const rua = document.getElementById(prefixo + '_rua');
        const bairro = document.getElementById(prefixo + '_bairro');
        const cidade = document.getElementById(prefixo + '_cidade');
        const estado = document.getElementById(prefixo + '_estado');

        if (rua) rua.value = data.logradouro || '';
        if (bairro) bairro.value = data.bairro || '';
        if (cidade) cidade.value = data.localidade || '';
        if (estado) estado.value = data.uf || '';
    } catch (e) {
        console.error('Erro ao buscar CEP');
    }
}

// Vincula o evento de busca ao sair do campo (blur)
if (cepContratante) {
    cepContratante.addEventListener('blur', (e) => buscarCep(e.target.value, 'contratante'));
}
if (cepContratado) {
    cepContratado.addEventListener('blur', (e) => buscarCep(e.target.value, 'contratado'));
}

// --- 2. MOTOR DE MÁSCARAS E INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    
    const applyMask = (input, method) => {
        input.addEventListener('input', e => {
            e.target.value = method(e.target.value);
            // Chama o cálculo para qualquer campo numérico alterado
            executarCalculo();
        });
    };

    const cpfCnpjMask = v => {
        v = v.replace(/\D/g, "");
        if (v.length <= 11) {
            return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, "$1.$2.$3-$4");
        } else {
            return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, "$1.$2.$3/$4-$5");
        }
    };

    const rgMask = v => {
        v = v.replace(/\D/g, "").substring(0, 9);
        return v.replace(/(\d{2})(\d{3})(\d{3})(\d{1})$/, "$1.$2.$3-$4");
    };

    const moneyMask = v => {
        v = v.replace(/\D/g, "");
        let value = (v / 100).toFixed(2);
        return value.replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    };

    // Aplica as máscaras
    document.querySelectorAll('.mask-cpf-cnpj').forEach(el => applyMask(el, cpfCnpjMask));
    document.querySelectorAll('.mask-rg').forEach(el => applyMask(el, rgMask));
    document.querySelectorAll('.mask-money').forEach(el => applyMask(el, moneyMask));
    
    // Adiciona ouvinte para o campo de quantidade (que não tem máscara mas afeta o cálculo)
    const qtdInput = document.getElementById('qtd_parcelas');

    if (qtdInput) {
        qtdInput.addEventListener('input', () => {
            let valor = parseInt(qtdInput.value);

            if (!valor || valor < 1) {
                valor = 1;
            } else if (valor > 12) {
                valor = 12;
            }

            qtdInput.value = valor;

            executarCalculo();
        });
    }
    // --- 3. CONTROLE DE JANELAS (PAGAMENTO E PARCELAMENTO) ---
    // Este bloco garante que os campos apareçam e sumam corretamente
    document.addEventListener('change', (e) => {
        const idsAlvo = ['forma_pagamento', 'tipo_parcelamento'];
        if (!idsAlvo.includes(e.target.id)) return;

        const valPagamento = document.getElementById('forma_pagamento').value;
        const valTipoParcela = document.getElementById('tipo_parcelamento').value;

        const wAvista = document.getElementById('wrapper_avista');
        const wAprazo = document.getElementById('wrapper_aprazo');
        const wParcelado = document.getElementById('wrapper_parcelado');
        const colEntrada = document.getElementById('col_entrada');

        // Mostra/Esconde as seções principais baseada na Forma de Pagamento
        if (wAvista) wAvista.style.display = (valPagamento === 'avista') ? 'block' : 'none';
        if (wAprazo) wAprazo.style.display = (valPagamento === 'aprazo') ? 'block' : 'none';
        if (wParcelado) wParcelado.style.display = (valPagamento === 'parcelado') ? 'block' : 'none';

        // Lógica da Entrada: Só aparece se for Parcelado E o tipo for "Com entrada"
        if (colEntrada) {
            if (valPagamento === 'parcelado' && valTipoParcela === 'com_entrada') {
                colEntrada.style.display = 'block';
            } else {
                colEntrada.style.display = 'none';
                // Limpa o valor da entrada se o campo sumir para não sujar o próximo cálculo
                const inputEntrada = document.getElementById('valor_entrada');
                if (inputEntrada) inputEntrada.value = "";
            }
        }

        // Atualiza o cálculo automaticamente ao trocar qualquer opção
        executarCalculo();
    });
});

// --- 4. FUNÇÃO GLOBAL DE CÁLCULO (VERSÃO CORRIGIDA) ---
function executarCalculo() {
    const fPagamento = document.getElementById('forma_pagamento').value;
    const elResultado = document.getElementById('valor_calculado_parcela');
    
    // TRAVA DE SEGURANÇA: Se não for parcelado, limpa o campo e para o código aqui
    if (fPagamento !== 'parcelado') {
        if (elResultado) elResultado.value = ""; 
        return; 
    }

    const elValorTotal = document.getElementById('valor');
    const elValorEntrada = document.getElementById('valor_entrada');
    const elQtdParcelas = document.getElementById('qtd_parcelas');
    const elTipoParcelamento = document.getElementById('tipo_parcelamento');

    if (!elValorTotal || !elResultado) return;

    // Converte a máscara (ex: 1.500,00) em número real (1500.00)
    const limpar = (val) => parseFloat(val.replace(/\D/g, "")) / 100 || 0;

    const total = limpar(elValorTotal.value);
    const entrada = (elTipoParcelamento && elTipoParcelamento.value === 'com_entrada') ? limpar(elValorEntrada.value) : 0;
    let qtd = parseInt(elQtdParcelas.value);

    // Proteção completa (mínimo e máximo)
    if (!qtd || qtd < 1) {
        qtd = 1;
    } else if (qtd > 12) {
        qtd = 12;
    }

    // Cálculo final
    const base = total - entrada;

    // Proteção contra valores inválidos
    if (base <= 0) {
        elResultado.value = "R$ 0,00";
        return;
    }

const resultado = base / qtd;

    // Exibe formatado como moeda
    elResultado.value = resultado > 0 
        ? resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
        : "R$ 0,00";
}

// --- ATIVAÇÃO DO BOTÃO DE E-MAIL (VERSÃO REVISADA) ---
document.addEventListener('DOMContentLoaded', function() {
    const emailBtn = document.getElementById('emailBtn');
    
    if (emailBtn) {
        emailBtn.addEventListener('click', function() {
            // Puxa o nome do contratante para o assunto
            const nome = document.getElementById('contratante_nome')?.value || "Cliente";
            
            // Texto formatado com quebras de linha (\n)
            const assunto = encodeURIComponent("Contrato de Prestação de Serviços - " + nome);
            const corpo = encodeURIComponent(
                "Olá,\n\n" +
                "Estou enviando a minuta do contrato para sua conferência.\n" +
                "Por favor, veja o arquivo PDF em anexo.\n\n" +
                "Atenciosamente,"
            );
            
            // Comando para abrir o e-mail
            window.location.href = `mailto:?subject=${assunto}&body=${corpo}`;
            
            // Alerta educativo para o usuário
            alert("Rascunho criado! Agora, salve o PDF do contrato e anexe-o na janela de e-mail que abriu.");
        });
    }
});

