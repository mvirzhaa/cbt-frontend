import { useState, useEffect, useCallback } from 'react';

/**
 * Generic API hook
 * @param {Function} apiFunc Service function returning a promise
 * @param {boolean} autoFetch Whether to fetch automatically on mount
 * @param {Array} initialParams Arguments to pass to apiFunc on mount
 */
export function useApi(apiFunc, autoFetch = true, initialParams = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...params) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFunc(...params);
      const dataVal = response?.data !== undefined ? response.data : response;
      setData(dataVal);
      return dataVal;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Terjadi kesalahan';
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  const paramsStr = JSON.stringify(initialParams);

  useEffect(() => {
    if (autoFetch) {
      execute(...initialParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, execute, paramsStr]);

  return {
    data,
    setData,
    loading,
    error,
    execute,
    refetch: execute
  };
}

export default useApi;
