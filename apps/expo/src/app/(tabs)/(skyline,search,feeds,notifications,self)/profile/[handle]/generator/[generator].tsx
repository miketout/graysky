import { useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Heart, Plus, Radio } from "lucide-react-native";

import { FeedPost } from "../../../../../../components/feed-post";
import { QueryWithoutData } from "../../../../../../components/query-without-data";
import { useAuthedAgent } from "../../../../../../lib/agent";
import { useTabPressScrollRef } from "../../../../../../lib/hooks";
import { useTimeline } from "../../../../../../lib/hooks/feeds";
import { useUserRefresh } from "../../../../../../lib/utils/query";

const Feed = () => {
  const agent = useAuthedAgent();
  const { handle, generator: genId } = useLocalSearchParams() as {
    handle: string;
    generator: string;
  };

  const generator = `at://${handle}/app.bsky.feed.generator/${genId}`;

  const { timeline, data } = useTimeline(generator);

  const info = useQuery({
    queryKey: ["generator", generator],
    queryFn: async () => {
      const gen = await agent.app.bsky.feed.getFeedGenerator({
        feed: generator,
      });
      if (!gen.success) throw new Error("Failed to get generator");
      return gen.data;
    },
  });

  const { refreshing, handleRefresh } = useUserRefresh(timeline.refetch);

  const ref = useTabPressScrollRef(timeline.refetch);

  if (!info.data) return <QueryWithoutData query={info} />;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <>
      <Stack.Screen
        options={{
          title: info.data.view.displayName,
          headerRight: () =>
            info.data.isOnline && info.data.isValid ? (
              <TouchableOpacity
                onPress={() => Alert.alert("Feed Info", "This feed is online")}
              >
                <Radio size={24} className="text-green-600" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    "Feed Info",
                    `This feed is ${
                      info.data.isOnline ? "not valid" : "offline"
                    }`,
                    [
                      {
                        text: "Cancel",
                        style: "cancel",
                      },
                      {
                        text: "Retry",
                        onPress: () => info.refetch(),
                      },
                    ],
                  )
                }
              >
                <Radio size={24} className="text-red-600" />
              </TouchableOpacity>
            ),
        }}
      />
      {children}
    </>
  );

  if (timeline.data) {
    return (
      <Wrapper>
        <FlashList
          ref={ref}
          data={data}
          renderItem={({ item: { hasReply, item }, index }) => (
            <FeedPost
              item={item}
              hasReply={hasReply}
              isReply={data[index - 1]?.hasReply}
              inlineParent={!data[index - 1]?.hasReply}
              dataUpdatedAt={timeline.dataUpdatedAt}
            />
          )}
          onEndReachedThreshold={0.5}
          onEndReached={() => void timeline.fetchNextPage()}
          onRefresh={() => void handleRefresh()}
          refreshing={refreshing}
          estimatedItemSize={91}
          ListHeaderComponent={() => (
            <View className="w-full border-b border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-black">
              <View className="w-full flex-row items-center">
                <Image
                  source={{ uri: info.data.view.avatar }}
                  className="h-16 w-16 rounded"
                />
                <View className="px-4">
                  <Text className="text-2xl font-medium">
                    {info.data.view.displayName}
                  </Text>
                  <Link
                    asChild
                    href={`/profile/${info.data.view.creator.handle}`}
                  >
                    <TouchableOpacity>
                      <Text className="text-base text-neutral-400">
                        By @{info.data.view.creator.handle}
                      </Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>
              {info.data.view.description && (
                <Text className="mt-4 text-base">
                  {info.data.view.description}
                </Text>
              )}
              <View className="mt-4 flex-row items-center">
                <TouchableOpacity className="flex-1 flex-row items-center justify-center rounded border border-neutral-400 py-2">
                  <Plus className="h-6 w-6 text-black" />
                  <Text className="ml-2 text-base">Subscribe</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {}}
                  className="ml-2 shrink-0 flex-row items-center rounded border border-red-200 bg-red-100 px-3 py-2"
                >
                  <Heart
                    className="h-8 w-8"
                    color={"#dc2626"}
                    fill={
                      info.data.view.viewer?.like ? "#dc2626" : "transparent"
                    }
                  />
                  <Text className="ml-2 text-base">
                    {info.data.view.likeCount}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListFooterComponent={
            timeline.isFetching ? (
              <View className="w-full items-center py-8">
                <ActivityIndicator />
              </View>
            ) : (
              <View className="py-16">
                <Text className="text-center">That&apos;s everything!</Text>
              </View>
            )
          }
          extraData={timeline.dataUpdatedAt}
        />
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <QueryWithoutData query={timeline} />
    </Wrapper>
  );
};

export default function FeedPage() {
  return (
    <>
      <Stack.Screen options={{ title: "Feed" }} />
      <Feed />
    </>
  );
}
