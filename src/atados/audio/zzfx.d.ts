// Tipos mínimos de `zzfx` (el paquete no trae declaraciones): solo lo que usa audio/motor.js.
declare module "zzfx" {
  export const ZZFX: {
    audioContext: AudioContext | null;
    sampleRate: number;
    buildSamples(...parametros: number[]): number[];
  };
}
