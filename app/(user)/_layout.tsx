// app/(user)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from "expo-router";

export default function UserLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#2563eb',
      headerShown: false, // 👈 We handle headers inside the screens now
      tabBarStyle: { height: 60, paddingBottom: 10, paddingTop: 10 }
    }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Catalog",
          tabBarLabel: "Shop",
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={24} color={color} />,
        }}
      />
      
      {/* 👇 ADD THIS SECTION */}
      <Tabs.Screen
        name="service"
        options={{
          title: "Service Request",
          tabBarLabel: "Service",
          tabBarIcon: ({ color }) => <Ionicons name="construct-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
  name="activity"
  options={{
    title: "My Activity",
    tabBarIcon: ({ color }) => <Ionicons name="time" size={24} color={color} />,
  }}
/>
    </Tabs>
  );
}