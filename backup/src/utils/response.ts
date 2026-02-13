export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    total?: number;
    [key: string]: any;
  };
}

export const successResponse = <T>(
  data: T, 
  meta?: ApiResponse['meta']
): ApiResponse<T> => ({
  success: true,
  data,
  meta
});

export const errorResponse = (
  error: string
): ApiResponse => ({
  success: false,
  error
});