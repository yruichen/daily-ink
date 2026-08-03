import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LearningPreferences } from "@ielts-diary/contracts";
import { api } from "../../api/client";

const QUERY_KEY = ["learning-preferences"] as const;
const DEFAULT_PREFERENCES: LearningPreferences = { newWordsPerSession: 20 };

export const useLearningPreferences = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: api.learningPreferences,
  });
  const mutation = useMutation({
    mutationFn: api.saveLearningPreferences,
    onMutate: async (preferences) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<{
        preferences: LearningPreferences;
      }>(QUERY_KEY);
      queryClient.setQueryData(QUERY_KEY, { preferences });
      return { previous };
    },
    onError: (_error, _preferences, context) => {
      if (context?.previous)
        queryClient.setQueryData(QUERY_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    preferences: query.data?.preferences ?? DEFAULT_PREFERENCES,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    error: query.error ?? mutation.error,
    save: mutation.mutate,
  };
};
