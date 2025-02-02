import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from "react-native";
import {
  openPicker,
  type Image as CroppedImage,
} from "react-native-image-crop-picker";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { RichText as RichTextHelper } from "@atproto/api";
import { useTheme } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { XIcon } from "lucide-react-native";

import { QueryWithoutData } from "~/components/query-without-data";
import { RichText } from "~/components/rich-text";
import KeyboardAwareScrollView from "~/components/scrollview/keyboard-aware-scrollview";
import { Text } from "~/components/themed/text";
import { TextInput } from "~/components/themed/text-input";
import { TransparentHeaderUntilScrolled } from "~/components/transparent-header";
import { useAgent } from "~/lib/agent";
import { compress, getGalleryPermission } from "~/lib/composer/utils";
import { cx } from "~/lib/utils/cx";
import { useSelf } from "./settings/account";

const MAX_DISPLAY_NAME = 64;
const MAX_DESCRIPTION = 256;

export default function EditBio() {
  const theme = useTheme();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<CroppedImage | null>(null);
  const [banner, setBanner] = useState<CroppedImage | null>(null);
  const agent = useAgent();
  const queryClient = useQueryClient();
  const router = useRouter();

  const self = useSelf();

  useEffect(() => {
    if (self.data) {
      setDisplayName((d) => (d === null ? self.data.displayName ?? "" : d));
      setDescription((d) => (d === null ? self.data.description ?? "" : d));
    }
  }, [self.data]);

  const rt = new RichTextHelper({ text: description ?? "" });
  rt.detectFacetsWithoutResolution();

  const { mutate: save, isPending: saving } = useMutation({
    mutationKey: ["save-profile"],
    mutationFn: async () => {
      await agent.upsertProfile(async (old) => {
        let newBanner, newAvatar;
        if (banner) {
          const uploadedBanner = await agent.uploadBlob(
            await compress({
              uri: banner.path,
              needsResize: false,
            }),
            {
              encoding: "image/jpeg",
            },
          );
          newBanner = uploadedBanner.data.blob;
        }
        if (avatar) {
          const uploadedAvatar = await agent.uploadBlob(
            await compress({
              uri: avatar.path,
              needsResize: false,
            }),
            {
              encoding: "image/jpeg",
            },
          );
          newAvatar = uploadedAvatar.data.blob;
        }
        return {
          ...old,
          banner: newBanner ?? old?.banner,
          avatar: newAvatar ?? old?.avatar,
          displayName: displayName?.trim() ?? "",
          description: description?.trim() ?? "",
        };
      });
    },
    onSettled: () => {
      router.push("../");
      void queryClient.invalidateQueries({ queryKey: ["self"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const dirty = useMemo(() => {
    return (
      self.data?.displayName !== displayName?.trim() ||
      self.data?.description !== description?.trim() ||
      avatar ||
      banner
    );
  }, [self.data, displayName, description, avatar, banner]);

  const cancelButton = useCallback(
    () => (
      <TouchableOpacity
        onPress={() => router.push("../")}
        className={Platform.select({
          android: "mr-3",
        })}
      >
        {Platform.select({
          ios: (
            <Text className="text-lg font-medium" primary>
              Cancel
            </Text>
          ),
          default: <XIcon color={theme.colors.text} size={24} />,
        })}
      </TouchableOpacity>
    ),
    [router, theme.colors.text],
  );

  const saveButton = useCallback(
    () => (
      <TouchableOpacity onPress={() => save()} disabled={!dirty || saving}>
        <Text
          className={cx(
            "text-lg font-medium",
            (!dirty || saving) && "text-neutral-500",
          )}
          primary
        >
          Save
        </Text>
      </TouchableOpacity>
    ),
    [save, dirty, saving],
  );

  const editAvatar = useCallback(async () => {
    const image = await getImage([1, 1], true).catch(() => null);
    if (!image) return;
    setAvatar(image);
  }, []);

  const editBanner = useCallback(async () => {
    const image = await getImage([1, 3]).catch(() => null);
    if (!image) return;
    setBanner(image);
  }, []);

  if (self.data) {
    return (
      <TransparentHeaderUntilScrolled>
        <KeyboardAwareScrollView
          className="flex-1"
          contentInsetAdjustmentBehavior="automatic"
        >
          <Stack.Screen
            options={{
              headerLeft: cancelButton,
              headerRight: saveButton,
              gestureEnabled: !dirty,
            }}
          />
          <View className="relative h-32">
            <TouchableHighlight
              onPress={editBanner}
              accessibilityRole="button"
              accessibilityLabel="Edit avatar"
            >
              <View className="h-full w-full bg-blue-500">
                <Image
                  source={banner?.path ?? self.data.banner}
                  className="h-full w-full"
                  contentFit="cover"
                />
              </View>
            </TouchableHighlight>
            <TouchableHighlight
              onPress={editAvatar}
              accessibilityRole="button"
              accessibilityLabel="Edit avatar"
            >
              <View
                style={{
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.card,
                }}
                className="absolute -bottom-12 left-4 h-24 w-24 rounded-full border-2"
              >
                <View className="h-full w-full rounded-full bg-blue-500">
                  <Image
                    source={avatar?.path ?? self.data.avatar}
                    className="h-full w-full rounded-full"
                    contentFit="cover"
                  />
                </View>
              </View>
            </TouchableHighlight>
          </View>
          <View className="mt-10 flex-1 px-4">
            <View className="my-4 flex-1">
              <Text className="mx-4 mb-1 mt-4 text-xs uppercase text-neutral-500">
                Display name
              </Text>
              <View
                style={{ backgroundColor: theme.colors.card }}
                className="flex-1 overflow-hidden rounded-lg"
              >
                <TextInput
                  value={displayName ?? ""}
                  placeholder="Required"
                  onChange={(evt) => setDisplayName(evt.nativeEvent.text)}
                  className="flex-1 flex-row items-center px-4 py-3 text-base leading-5"
                  maxLength={MAX_DISPLAY_NAME}
                />
              </View>
            </View>
            <View className="mb-4 flex-1">
              <Text className="mx-4 mb-1 mt-4 text-xs uppercase text-neutral-500">
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
                  maxLength={MAX_DESCRIPTION}
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
            </View>
          </View>
        </KeyboardAwareScrollView>
      </TransparentHeaderUntilScrolled>
    );
  }

  return <QueryWithoutData query={self} />;
}

async function getImage(aspect: [number, number], circle = false) {
  if (!(await getGalleryPermission())) return;
  const response = await openPicker({
    height: aspect[0] * 1000,
    width: aspect[1] * 1000,
    cropping: true,
    cropperCircleOverlay: circle,
    forceJpg: true,
  });

  return response as CroppedImage;
}
