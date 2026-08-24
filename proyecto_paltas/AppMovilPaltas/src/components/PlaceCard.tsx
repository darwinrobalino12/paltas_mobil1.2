import React from 'react';

import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

export interface PlaceCardProps {
  title: string;
  description?: string;
  imageUrl?: string;

  onPress?: () => void;

  accessibilityLabel?: string;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({
  title,
  description,
  imageUrl,
  onPress,
  accessibilityLabel,
}) => {
  const content = (
    <View style={styles.container}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          accessibilityRole="image"
          accessibilityLabel={`Imagen de ${title}`}
        />
      ) : null}

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>

        {description ? (
          <Text style={styles.description}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radius.lg,
  },

  pressed: {
    opacity: 0.8,
  },

  container: {
    backgroundColor: colors.background,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: radius.lg,

    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: 160,
  },

  content: {
    padding: spacing.md,
  },

  title: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  description: {
    ...typography.body,
    color: colors.textSecondary,
  },
});