import { View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

import { useOptionalAgent } from "~/lib/agent";
import { cx } from "~/lib/utils/cx";

interface Props {
  size?: "large" | "medium" | "small";
}

export const Avatar = ({ size = "large" }: Props) => (
  <ErrorBoundary
    fallback={
      <View
        className={cx("rounded-full bg-neutral-200 dark:bg-neutral-800", {
          "h-7 w-7": size === "small",
          "h-10 w-10": size === "medium",
          "h-12 w-12": size === "large",
        })}
      />
    }
  >
    <AvatarInner size={size} />
  </ErrorBoundary>
);

const AvatarInner = ({ size }: Props) => {
  const agent = useOptionalAgent();

  const className = cx("rounded-full bg-neutral-200 dark:bg-neutral-800", {
    "h-7 w-7": size === "small",
    "h-10 w-10": size === "medium",
    "h-12 w-12": size === "large",
  });

  const profile = useQuery({
    queryKey: ["profile", agent?.session?.did],
    queryFn: async () => {
      if (!agent?.session) return null;
      const profile = await agent.getProfile({
        actor: agent.session.did,
      });
      return profile.data;
    },
  });

  const uri = profile.data?.avatar;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        alt={profile.data?.displayName}
        className={className}
      />
    );
  }

  return <View className={className} />;
};
