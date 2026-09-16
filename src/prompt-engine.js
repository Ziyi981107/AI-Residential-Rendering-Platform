export const RESIDENTIAL_PROMPT_VERSION = 'residential_v0.1';

export class PromptEngine {
  constructor(version = RESIDENTIAL_PROMPT_VERSION) { this.version = version; }

  build(context) {
    const instruction = context.user_instruction?.trim() || 'No additional requirements.';
    return [
      'RESIDENTIAL RENDERING TASK',
      `TASK TYPE: ${context.task_type}`,
      `PROMPT VERSION: ${context.prompt_version}`,
      '',
      'STRUCTURE REFERENCE',
      'Use this reference as the sole authority for building count, building position, massing relationships, overall height relationships, road layout, camera position, perspective, and composition.',
      'Do not let the style reference redefine the structure.',
      '',
      'STYLE REFERENCE',
      'Use this reference only for visual style, materials, colors, lighting, and architectural presentation.',
      '',
      'RESIDENTIAL VISUAL DIRECTION',
      'Create a high-quality contemporary residential architectural visualization with realistic materials and natural expression of glass, metal, and stone. Avoid directly preserving crude SketchUp black outlines. Show complete, believable architectural facade visualization.',
      '',
      'USER ADDITIONAL REQUIREMENTS',
      instruction
    ].join('\n');
  }
}
