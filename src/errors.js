export class AppError extends Error {
  constructor(code, message, status = 400, cause) {
    super(message, { cause });
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export function publicError(error) {
  if (error instanceof AppError) return error;
  return new AppError('INTERNAL_ERROR', 'The rendering task could not be completed.', 500, error);
}
