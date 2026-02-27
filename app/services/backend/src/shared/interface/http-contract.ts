export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    field?: string;
  };
};

export const ok = <T>(data: T): ApiSuccess<T> => ({
  ok: true,
  data
});
