/**
 * Genera un código de pedido de 4 dígitos no correlativo.
 * Ejemplo: #SUMI-5978, #SUMI-2401, #SUMI-8934.
 *
 * Objetivo: Impedir que clientes y competidores puedan deducir el volumen de pedidos
 * o la fecha de creación a través de números secuenciales predecibles.
 */
export function generateOrderCode(): string {
  // Genera un número de 4 dígitos aleatorio entre 1000 y 9999
  const randomFourDigits = Math.floor(1000 + Math.random() * 9000);
  return `#SUMI-${randomFourDigits}`;
}

