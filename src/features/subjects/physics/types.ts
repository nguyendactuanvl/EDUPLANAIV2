/**
 * @file types.ts
 * @description Các kiểu dữ liệu chuyên biệt cho Physics Toolkit (Vật lý THPT GDPT 2018).
 */

export interface DhoInput {
  amplitudeA: number;     // cm
  periodT?: number;       // s
  frequencyF?: number;    // Hz
  omega?: number;         // rad/s
  phasePhi?: number;      // rad
  timeT?: number;         // s
}

export interface DhoOutput {
  amplitudeA: number;
  periodT: number;
  frequencyF: number;
  omega: number;
  vMax: number;          // cm/s
  aMax: number;          // cm/s^2
  xCurrent?: number;     // cm
  vCurrent?: number;     // cm/s
  aCurrent?: number;     // cm/s^2
  explanation: string[];
}

export interface RlcInput {
  resistanceR: number;    // Ohm
  inductanceL: number;    // H
  capacitanceC: number;   // F (vd 10^-5)
  frequencyF: number;     // Hz
  voltageU: number;       // V
}

export interface RlcOutput {
  omega: number;
  ZL: number;
  ZC: number;
  Z: number;
  I: number;
  cosPhi: number;
  phasePhiRad: number;
  powerP: number;
  f0Resonance: number;
  explanation: string[];
}

export interface IdealGasThermalInput {
  pressureP?: number;     // Pa
  volumeV?: number;       // m^3
  temperatureK?: number;  // K
  molesN?: number;        // mol
  workDoneA?: number;     // J (Công nhận hoặc sinh ra)
  heatAddedQ?: number;    // J (Nhiệt lượng nhận hoặc tỏa)
}

export interface IdealGasThermalOutput {
  pressureP: number;
  volumeV: number;
  temperatureK: number;
  molesN: number;
  deltaU: number;         // J (Biến thiên nội năng ΔU = A + Q)
  explanation: string[];
}

export interface CircuitConfig {
  type: 'series' | 'parallel';
  hasR: boolean;
  hasL: boolean;
  hasC: boolean;
  hasAmmeter: boolean;
  hasVoltmeter: boolean;
  hasSwitch: boolean;
  isSwitchClosed: boolean;
  sourceVoltage: number;
}

export interface WaveGraphConfig {
  graphType: 'dho_x' | 'dho_v' | 'wave_sine';
  amplitudeA: number;     // cm
  periodT: number;        // s
  wavelengthLambda: number; // cm
  phasePhi: number;       // rad
}
