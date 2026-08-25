import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useApp } from './context/AppContext';
import { colors, fonts } from './theme';
import { IconButton } from './components/ui';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/admin/DashboardScreen';
import ProductsScreen from './screens/admin/ProductsScreen';
import ProductFormScreen from './screens/admin/ProductFormScreen';
import SalesScreen from './screens/admin/SalesScreen';
import DonationsScreen from './screens/admin/DonationsScreen';
import ShopScreen from './screens/user/ShopScreen';
import ProductDetailScreen from './screens/user/ProductDetailScreen';
import CartScreen from './screens/user/CartScreen';
import AddressScreen from './screens/user/AddressScreen';
import CheckoutScreen from './screens/user/CheckoutScreen';
import DonateScreen from './screens/user/DonateScreen';
import PaymentScreen from './screens/user/PaymentScreen';
import SuccessScreen from './screens/user/SuccessScreen';
import ProfileScreen from './screens/user/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primaryDark, background: colors.bg, card: colors.bg, text: colors.text, border: colors.border } };
const stackOpts = {
  headerTintColor: colors.text,
  headerTitleStyle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.bg },
  headerBackTitleVisible: false,
};

// ícone outline inativo / preenchido ativo — uma família, uma hierarquia
const ICONS = { Dashboard: 'stats-chart', Produtos: 'shirt', Vendas: 'receipt', Doações: 'heart', Loja: 'storefront', Carrinho: 'cart', Doar: 'heart', Perfil: 'person' };

function LogoutButton() {
  const { logout } = useApp();
  return (
    <IconButton onPress={logout} label="Sair da conta">
      <Ionicons name="log-out-outline" size={24} color={colors.muted} />
    </IconButton>
  );
}

function TabIcon({ route, color, size, focused }) {
  const { cart } = useApp();
  const name = focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`;
  return (
    <View>
      <Ionicons name={name} size={size} color={color} />
      {route.name === 'Carrinho' && cart.length > 0 && (
        <View style={{ position: 'absolute', top: -5, right: -9, backgroundColor: colors.accent, borderRadius: 999, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.surface }}>
          <Text style={{ color: colors.onPrimary, fontSize: 10, fontFamily: fonts.extrabold }}>{cart.length}</Text>
        </View>
      )}
    </View>
  );
}

const tabOpts = ({ route }) => ({
  ...stackOpts,
  headerRight: () => <LogoutButton />,
  tabBarActiveTintColor: colors.primaryDark,
  tabBarInactiveTintColor: colors.muted,
  tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
  tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64, paddingTop: 6 },
  tabBarIcon: (p) => <TabIcon route={route} {...p} />,
});

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={tabOpts}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Painel' }} />
      <Tab.Screen name="Produtos" component={ProductsScreen} />
      <Tab.Screen name="Vendas" component={SalesScreen} />
      <Tab.Screen name="Doações" component={DonationsScreen} />
    </Tab.Navigator>
  );
}

function UserTabs() {
  return (
    <Tab.Navigator screenOptions={tabOpts}>
      <Tab.Screen name="Loja" component={ShopScreen} options={{ title: 'Bazar do Renascer' }} />
      <Tab.Screen name="Carrinho" component={CartScreen} />
      <Tab.Screen name="Doar" component={DonateScreen} options={{ title: 'Quero apenas doar' }} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { user } = useApp();
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={stackOpts}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : user.role === 'admin' ? (
          <>
            <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ProductForm" component={ProductFormScreen} options={({ route }) => ({ title: route.params?.id ? 'Editar peça' : 'Nova peça' })} />
          </>
        ) : (
          <>
            <Stack.Screen name="UserTabs" component={UserTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="Address" component={AddressScreen} options={{ title: 'Endereço de entrega' }} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Finalizar compra' }} />
            <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Pagamento' }} />
            <Stack.Screen name="Success" component={SuccessScreen} options={{ headerShown: false, gestureEnabled: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
