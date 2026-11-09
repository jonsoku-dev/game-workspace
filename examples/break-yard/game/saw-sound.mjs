const clamp = (value, max = 1) => Math.max(0, Math.min(max, Number(value) || 0));

export function createSawSound() {
  let context, graph, enabled = false, unavailable = false;

  function fade(param, value, seconds = .025) {
    const now = context.currentTime;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else { param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); }
    param.linearRampToValueAtTime(value, now + seconds);
  }

  function silence() {
    if (!graph || context.state === 'closed') return;
    try { fade(graph.output.gain, 0, .015); } catch { /* Audio device was removed. */ }
  }

  function build() {
    const output = context.createGain(); output.gain.value = 0;
    output.connect(context.destination);
    const motor = context.createOscillator(); motor.type = 'sawtooth';
    const motorGain = context.createGain(); motorGain.gain.value = 0;
    const motorFilter = context.createBiquadFilter(); motorFilter.type = 'lowpass';
    motorFilter.frequency.value = 650; motorFilter.Q.value = .5;
    motor.connect(motorFilter); motorFilter.connect(motorGain); motorGain.connect(output);
    const teeth = context.createOscillator(); teeth.type = 'triangle';
    const teethGain = context.createGain(); teethGain.gain.value = 0;
    teeth.connect(teethGain); teethGain.connect(output);
    const noise = context.createBufferSource(); noise.loop = true;
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = 31;
    for (let i = 0; i < samples.length; i++) {
      seed = seed * 16807 % 2147483647; samples[i] = seed / 1073741823.5 - 1;
    }
    noise.buffer = buffer;
    const raspFilter = context.createBiquadFilter(); raspFilter.type = 'bandpass'; raspFilter.Q.value = .8;
    const raspGain = context.createGain(); raspGain.gain.value = 0;
    noise.connect(raspFilter); raspFilter.connect(raspGain); raspGain.connect(output);
    graph = { output, motor, motorGain, motorFilter, teeth, teethGain, noise, raspFilter, raspGain };
    motor.start(); teeth.start(); noise.start();
  }

  return {
    // Only the host's trusted input handler may create or resume the audio context.
    unlock(value) {
      enabled = Boolean(value);
      if (!enabled) { silence(); return; }
      if (unavailable || globalThis.navigator?.userActivation?.isActive !== true) return;
      try {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContext) { unavailable = true; return; }
        context ||= new AudioContext();
        if (!graph) build();
        if (context.state === 'suspended' || context.state === 'interrupted') {
          void context.resume().catch(() => { silence(); });
        }
      } catch {
        unavailable = true; silence();
        if (context && context.state !== 'closed') void context.close().catch(() => {});
      }
    },
    update(state, active) {
      if (!enabled || !active || !graph || context.state !== 'running' || globalThis.document?.hidden) {
        silence(); return;
      }
      try {
        const speed = clamp(Math.abs(state.tool?.angularVelocity || 0), 60);
        if (speed < .1) { silence(); return; }
        const contact = state.contact || {};
        const touching = Boolean(contact.contactPatch) && ['enter', 'stay'].includes(contact.phase);
        const pressure = touching ? clamp(contact.pressure ?? (contact.depth / 8)) : 0;
        const slip = touching ? clamp(Math.abs(contact.slip || 0) / 700) : 0;
        const bite = Math.sqrt(pressure * slip);
        const guard = contact.material === 'guard';
        const core = contact.material === 'core';
        const spin = speed / 22;
        const now = context.currentTime;
        graph.motor.frequency.setTargetAtTime((55 + speed * 8) * (1 - bite * .18), now, .04);
        graph.motorFilter.frequency.setTargetAtTime(350 + spin * 700, now, .04);
        graph.teeth.type = guard ? 'sawtooth' : 'triangle';
        graph.teeth.frequency.setTargetAtTime(Math.max(30, speed * 24 / (Math.PI * 2)) * (guard ? 3.1 : core ? .8 : 1.6), now, .025);
        graph.raspFilter.frequency.setTargetAtTime((guard ? 3200 : core ? 1000 : 1900) * (.7 + slip * .3), now, .025);
        fade(graph.motorGain.gain, .003 + clamp(spin) * .017);
        fade(graph.teethGain.gain, bite * (guard ? .023 : .012));
        fade(graph.raspGain.gain, bite * (guard ? .075 : core ? .045 : .06));
        fade(graph.output.gain, .55);
      } catch { silence(); }
    },
    silence,
  };
}
