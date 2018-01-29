import makeKernel from '../utilities/make-kernel';
import zeros2D from '../utilities/zeros-2d';

export default class MomentumRootMeanSquaredPropagation {
  static get defaults() {
    return {
      decayRate: 0.999,
      regularizationStrength: 0.00001,
      learningRate: 0.01,
      smoothEps: 1e-8,
      clipValue: 5
    };
  }

  constructor(layer, settings = {}) {
    this.layer = layer;
    this.width = layer.width;
    this.height = layer.height;
    this.momentums = zeros2D(layer.width, layer.height);
    Object.assign(this, this.constructor.defaults, settings);
    this.setupKernels();
  }

  run(previousLayer, nextLayer, learningRate) {
    const output = this.kernel(
      this.layer.weights,
      this.layer.deltas,
      this.learningRate,
      this.momentums,
      this.decayRate,
      this.regularizationStrength,
      this.clipValue
    );
    this.momentums = output.momentums;
    return output.result;
  }

  setupKernels() {
    this.kernel = makeKernel(momentumRootMeanSquaredPropagation, {
      output: [this.width, this.height],
      constants: {
        smoothEps: this.smoothEps
      },
      functions: [
        clipByValue
      ],
      map: {
        momentums: getMomentum
      }
    })
  }
}

/**
 * @description Mathematician friendly name of MomentumRootMeanSquaredPropagation class. For those that are not mere mortals
 * @type {MomentumRootMeanSquaredPropagation}
 */
const MRmsProp = MomentumRootMeanSquaredPropagation;

/**
 * @description Momentum Root Mean Square Propagation Function
 * @returns {number}
 */
function momentumRootMeanSquaredPropagation(
  weights, deltas, learningRate, previousMomentums, decayRate, regularizationStrength, clipValue) {
  const delta = deltas[this.thread.y][this.thread.x];
  const clippedDelta = clipByValue(delta, clipValue, -clipValue);
  const weight = weights[this.thread.y][this.thread.x];
  const previousMomentum = previousMomentums[this.thread.y][this.thread.x];
  const momentum = getMomentum(delta, decayRate, previousMomentum);
  return weight + -learningRate * clippedDelta / Math.sqrt(momentum + this.constants.smoothEps) - regularizationStrength * weight;
}

function getMomentum(delta, decay, previousMomentum) {
  return previousMomentum * decay + (1 - decay) * delta * delta;
}

export function clipByValue(value, max, min) {
  if (value > max) {
    return max;
  }
  if (value < min) {
    return min;
  }
  return value;
}

export function isClippedByValue(value, max, min) {
  if (value > max) {
    return 1;
  }
  if (value < min) {
    return 1;
  }
  return 0;
}

export {
  getMomentum,
  MRmsProp
};
