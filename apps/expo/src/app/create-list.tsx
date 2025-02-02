import { useCallback, useState } from "react";
import {
  Platform,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { RichText as RichTextHelper } from "@atproto/api";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { useTheme } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { RichText } from "~/components/rich-text";
import KeyboardAwareScrollView from "~/components/scrollview/keyboard-aware-scrollview";
import { TextButton } from "~/components/text-button";
import { Text } from "~/components/themed/text";
import { TextInput } from "~/components/themed/text-input";
import { TransparentHeaderUntilScrolled } from "~/components/transparent-header";
import { useAgent } from "~/lib/agent";
import { compress, getGalleryPermission } from "~/lib/composer/utils";

export default function CreateListScreen() {
  const theme = useTheme();
  const agent = useAgent();
  const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset | null>(
    null,
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState<
    "app.bsky.graph.defs#curatelist" | "app.bsky.graph.defs#modlist" | null
  >(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showActionSheetWithOptions } = useActionSheet();

  const rt = new RichTextHelper({ text: description });
  rt.detectFacetsWithoutResolution();

  const handleChangeAvatar = useCallback(async () => {
    const permission = await getGalleryPermission();
    if (!permission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      aspect: [1, 1],
      allowsEditing: true,
      exif: false,
      quality: 0.7,
    });

    if (result?.assets?.[0]) {
      setAvatar(result.assets[0]);
    }
  }, []);

  const handleSelectPurpose = useCallback(() => {
    const options = ["User list", "Moderation list"];
    showActionSheetWithOptions(
      {
        options: [...options, "Cancel"],
        cancelButtonIndex: options.length,
      },
      (index) => {
        switch (index) {
          case 0:
            setPurpose("app.bsky.graph.defs#curatelist");
            break;
          case 1:
            setPurpose("app.bsky.graph.defs#modlist");
            break;
        }
      },
    );
  }, [showActionSheetWithOptions]);

  const createList = useMutation({
    mutationKey: ["create-list"],
    mutationFn: async () => {
      const rt = new RichTextHelper({
        text: description.trim(),
      });
      await rt.detectFacets(agent);
      const descriptionFacets = rt.facets;

      let avatarUrl;

      if (avatar) {
        const uploadedAvatar = await agent.uploadBlob(
          await compress({
            uri: avatar.uri,
            needsResize: false,
          }),
          {
            encoding: "image/jpeg",
          },
        );
        avatarUrl = uploadedAvatar.data.blob;
      }

      await agent.app.bsky.graph.list.create(
        {
          repo: agent.session?.did,
        },
        {
          name,
          description: description.trim(),
          descriptionFacets,
          avatar: avatarUrl,
          purpose: purpose ?? "app.bsky.graph.defs#curatelist",
          createdAt: new Date().toISOString(),
        },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [agent.session?.did, "lists"],
      });
      router.push("../");
    },
  });

  const headerLeft = useCallback(
    () =>
      Platform.select({
        ios: (
          <TouchableOpacity onPress={() => router.push("../")}>
            <Text primary className="text-lg">
              Cancel
            </Text>
          </TouchableOpacity>
        ),
      }),
    [router],
  );

  return (
    <>
      <Stack.Screen options={{ headerLeft }} />
      <TransparentHeaderUntilScrolled>
        <KeyboardAwareScrollView
          className="flex-1 px-4"
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          <Text className="mx-4 mb-1.5 mt-6 text-xs uppercase text-neutral-500">
            List Avatar
          </Text>
          <View
            style={{ backgroundColor: theme.colors.card }}
            className="flex-1 overflow-hidden rounded-lg px-4 py-2"
          >
            <TouchableHighlight
              className="h-14 w-14 rounded-lg"
              onPress={handleChangeAvatar}
            >
              <View className="flex-1 rounded-lg bg-blue-500">
                {avatar && (
                  <Image
                    source={avatar.uri}
                    className="h-full w-full rounded-lg"
                  />
                )}
              </View>
            </TouchableHighlight>
          </View>
          <Text className="mx-4 mb-1.5 mt-6 text-xs uppercase text-neutral-500">
            List name
          </Text>
          <View
            style={{ backgroundColor: theme.colors.card }}
            className="flex-1 overflow-hidden rounded-lg"
          >
            <TextInput
              value={name}
              maxLength={64}
              onChange={(evt) => setName(evt.nativeEvent.text)}
              className="flex-1 flex-row items-center px-4 py-3 text-base leading-5"
              autoFocus
            />
          </View>
          <Text className="mx-4 mb-1.5 mt-6 text-xs uppercase text-neutral-500">
            Description
          </Text>
          <View
            style={{ backgroundColor: theme.colors.card }}
            className="flex-1 overflow-hidden rounded-lg"
          >
            <TextInput
              onChange={(evt) => setDescription(evt.nativeEvent.text)}
              placeholder="Optional"
              multiline
              className="flex-1 flex-row items-center px-4 py-3 text-base leading-5"
            >
              <RichText
                size="base"
                text={rt.text}
                facets={rt.facets}
                truncate={false}
                disableLinks
              />
            </TextInput>
          </View>
          <Text className="mx-4 mb-1.5 mt-6 text-xs uppercase text-neutral-500">
            Purpose
          </Text>
          <TouchableHighlight
            onPress={handleSelectPurpose}
            className="flex-1 overflow-hidden rounded-lg"
          >
            <View
              style={{ backgroundColor: theme.colors.card }}
              className="flex-1 rounded-lg px-4 py-2.5"
            >
              <Text primary className="text-base">
                {purpose === "app.bsky.graph.defs#curatelist"
                  ? "User list"
                  : purpose === "app.bsky.graph.defs#modlist"
                    ? "Moderation list"
                    : "Select list purpose"}
              </Text>
            </View>
          </TouchableHighlight>
          <View className="flex-row items-center justify-end pt-4">
            <TextButton
              disabled={!name || !purpose || createList.isPending}
              onPress={createList.mutate}
              title="Create list"
              className="font-medium"
            />
          </View>
        </KeyboardAwareScrollView>
      </TransparentHeaderUntilScrolled>
    </>
  );
}
