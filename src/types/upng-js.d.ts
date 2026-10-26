/** Only the quantizer is used; @types/upng-js describes an older, incompatible API */
declare module 'upng-js' {
  interface QuantizeResult {
    /** One RGBA buffer per input, every pixel replaced by its palette colour */
    bufs: ArrayBuffer[];
  }
  const UPNG: {
    quantize(bufs: ArrayBuffer[], colors: number): QuantizeResult;
  };
  export default UPNG;
}
