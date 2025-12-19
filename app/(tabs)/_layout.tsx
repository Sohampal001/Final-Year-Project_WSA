// app/(tabs)/_layout.tsx
// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name="home-outline"
              size={26}
              color={focused ? '#0f766e' : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: 'Contact',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name="call-outline"
              size={26}
              color={focused ? '#0f766e' : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="nearest"
        options={{
          title: 'Nearest',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name="people-outline"
              size={26}
              color={focused ? '#0f766e' : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="recording"
        options={{
          title: 'Recording',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name="mic-outline"
              size={26}
              color={focused ? '#0f766e' : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name="person-outline"
              size={26}
              color={focused ? '#0f766e' : color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
