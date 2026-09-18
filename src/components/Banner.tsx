import React from "react";
import {
  View,
  Text,
  ImageBackground,
  Image,
  Dimensions,
  StyleSheet,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";

const { width } = Dimensions.get("window");

const BannerSection: React.FC = () => {
  // Slider data with images
  const banners = [
    {
      image: require("../assets/Banner1.jpg"),
      text: "Organic Agri Expo 2025",
      additionalText: "Delhi • 10th - 12th Dec",
    },
    {
      image: require("../assets/banner2.jpg"),
      text: "Health & Wellness Expo",
      additionalText: "Mumbai • 15th - 17th Jan",
    },
    {
      image: require("../assets/Banner3.jpg"),
      text: "International Yoga Summit",
      additionalText: "Rishikesh • 20th Feb",
    },
  ];

  return (
    <ImageBackground
      source={require("../assets/background_new_change.png")} // optional background
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <Carousel
        loop
        autoPlay
        autoPlayInterval={3000}
        width={width}
        height={240}
        data={banners}
        scrollAnimationDuration={1000}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={item.image} style={styles.slideImage} />
            <View style={styles.textOverlay}>
              <Text style={styles.title}>{item.text}</Text>
              <Text style={styles.subtitle}>{item.additionalText}</Text>
            </View>
          </View>
        )}
      />
    </ImageBackground>
  );
};

export default BannerSection;

const styles = StyleSheet.create({
  backgroundImage: {
    width: "100%",
    height: 255,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)", // slightly transparent
  },
  slide: {
    width: width,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
  },
  slideImage: {
    width: width * 0.9,
    height: 240, 
    resizeMode: "cover",
  },
  textOverlay: {
    position: "absolute",
    bottom: 5,
    left: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 14,
    color: "#eee",
    marginTop: 4,
  },
});
