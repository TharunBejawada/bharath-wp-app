import { Ionicons } from '@expo/vector-icons';
import { Tabs } from "expo-router";

export default function AdminLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#1e293b',
      headerShown: true 
    }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Admin Dashboard",
          tabBarLabel: "Overview",
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Stock"
        options={{
          title: "Stock Dashboard",
          tabBarLabel: "Stock",
          tabBarIcon: ({ color }) => <Ionicons name="layers-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Availability"
        options={{
          title: "Availability Dashboard",
          tabBarLabel: "Availability",
          tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={24} color={color} />,
        }}
      />
      {/* We will add 'Stock' and 'Requests' tabs here later */}
      <Tabs.Screen name="Add Stock" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="Edit Product" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="Booking Details" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="Add Sale" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="Upcoming Services" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="Sales History" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}