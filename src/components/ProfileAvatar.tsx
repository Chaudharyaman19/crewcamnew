import React, { useEffect, useState } from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

import { colors } from '../theme';

type ProfileAvatarProps = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  iconSize?: number;
};

export default function ProfileAvatar({
  uri,
  style,
  iconSize = 22,
}: ProfileAvatarProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const hasImage = Boolean(uri?.trim());

  useEffect(() => {
    setLoadFailed(false);
  }, [uri]);

  if (hasImage && !loadFailed) {
    return (
      <Image
        source={{ uri: uri!.trim() }}
        style={style}
        onError={() => setLoadFailed(true)}
      />
    );
  }

  return (
    <View style={[style as StyleProp<ViewStyle>, styles.fallback]}>
      <FontAwesomeIcon icon={faUser} size={iconSize} color={colors.bg} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f4f7',
  },
});
