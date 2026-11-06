const RAIO_MAXIMO_KM = 30;
const VALOR_FRETE_GRATIS_ACIMA_DE = 80.0;
const VALOR_FRETE_PADRAO = 8.0;
const PRAZO_ENTREGA_DIAS_UTEIS = 2;

/**
 * Simula o cálculo de distância a partir do CEP (protótipo).
 * Em produção, isto chamaria uma API de geocodificação/CEP real.
 * Aqui, deriva-se uma distância pseudoaleatória-porém-determinística
 * a partir dos dígitos do CEP, para que o mesmo CEP sempre repita o
 * mesmo resultado (útil para demonstração e testes).
 */
function distanciaSimuladaKm(cep) {
  const digitos = cep.replace(/\D/g, '');
  const soma = digitos.split('').reduce((s, d) => s + Number(d), 0);
  return (soma * 3) % 45; // 0 a 44 km
}

function calcularFrete({ cep, subtotal }) {
  const distancia = distanciaSimuladaKm(cep);
  if (distancia > RAIO_MAXIMO_KM) {
    const err = new Error('Infelizmente não entregamos no CEP informado. Nosso raio máximo é de 30 km.');
    err.status = 422;
    err.code = 'CEP_FORA_DE_COBERTURA';
    throw err;
  }
  const gratis = subtotal >= VALOR_FRETE_GRATIS_ACIMA_DE;
  return {
    distancia_km: distancia,
    valor_frete: gratis ? 0 : VALOR_FRETE_PADRAO,
    frete_gratis: gratis,
    prazo_dias_uteis: PRAZO_ENTREGA_DIAS_UTEIS,
  };
}

module.exports = { calcularFrete, RAIO_MAXIMO_KM, VALOR_FRETE_GRATIS_ACIMA_DE };
