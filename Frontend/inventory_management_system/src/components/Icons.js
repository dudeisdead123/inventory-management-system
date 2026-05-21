import React from 'react';
import {
  MapPin, TrendingUp, Layers, Trophy, Heart, AlertTriangle, Download,
  LayoutDashboard, Box, PackagePlus, Users, Sun, Moon, LogOut,
  Hexagon, Shield, BarChart3, Check, ArrowRight, Search, Plus,
  Pencil, Trash2, ArrowDownLeft, ArrowUpRight, Wand2, Zap,
  ShoppingCart, User, RefreshCw, Receipt, TestTube, CheckCircle2,
  Eye, EyeOff, Key, Activity, Package, ArrowLeft, Mail, FileSpreadsheet,
  ConciergeBell, Send, X, MessagesSquare
} from 'lucide-react';

// Wrapper to apply consistent styling and animations
const IconWrapper = ({ icon: Icon, className = "", size = 20, strokeWidth = 1.5, color = "currentColor", ...props }) => {
  return (
    <Icon 
      className={`lucide-icon ${className}`} 
      size={size} 
      strokeWidth={strokeWidth} 
      color={color} 
      {...props} 
    />
  );
};

export const Icons = {
  // Brand
  Brand: (props) => <IconWrapper icon={Hexagon} className="icon-draw-in" {...props} />,
  
  // Navigation
  Dashboard: (props) => <IconWrapper icon={LayoutDashboard} {...props} />,
  Products: (props) => <IconWrapper icon={Box} {...props} />,
  Stock: (props) => <IconWrapper icon={PackagePlus} {...props} />,
  Customers: (props) => <IconWrapper icon={Users} {...props} />,
  Admin: (props) => <IconWrapper icon={Shield} {...props} />,
  ThemeLight: (props) => <IconWrapper icon={Sun} className="icon-hover-spin" {...props} />,
  ThemeDark: (props) => <IconWrapper icon={Moon} className="icon-hover-spin" {...props} />,
  Logout: (props) => <IconWrapper icon={LogOut} {...props} />,

  // Analytics
  Location: (props) => <IconWrapper icon={MapPin} className="icon-float" {...props} />,
  Trend: (props) => <IconWrapper icon={TrendingUp} className="icon-pulse-soft" {...props} />,
  Category: (props) => <IconWrapper icon={Layers} {...props} />,
  Trophy: (props) => <IconWrapper icon={Trophy} className="icon-float" {...props} />,
  Health: (props) => <IconWrapper icon={Activity} className="icon-pulse-soft" {...props} />,
  Alert: (props) => <IconWrapper icon={AlertTriangle} {...props} />,
  Export: (props) => <IconWrapper icon={Download} {...props} />,
  PDF: (props) => <IconWrapper icon={Receipt} {...props} />,
  Excel: (props) => <IconWrapper icon={FileSpreadsheet} {...props} />,
  Email: (props) => <IconWrapper icon={Mail} {...props} />,
  EyeShow: (props) => <IconWrapper icon={Eye} {...props} />,
  EyeHide: (props) => <IconWrapper icon={EyeOff} {...props} />,

  // Actions
  Search: (props) => <IconWrapper icon={Search} {...props} />,
  Add: (props) => <IconWrapper icon={Plus} {...props} />,
  Edit: (props) => <IconWrapper icon={Pencil} {...props} />,
  Delete: (props) => <IconWrapper icon={Trash2} {...props} />,
  ArrowRight: (props) => <IconWrapper icon={ArrowRight} {...props} />,
  Check: (props) => <IconWrapper icon={Check} {...props} />,
  ArrowLeft: (props) => <IconWrapper icon={ArrowLeft} {...props} />,
  Refresh: (props) => <IconWrapper icon={RefreshCw} className="icon-hover-spin" {...props} />,

  // Stock Specific
  Inbound: (props) => <IconWrapper icon={ArrowDownLeft} {...props} />,
  Outbound: (props) => <IconWrapper icon={ArrowUpRight} {...props} />,
  Wizard: (props) => <IconWrapper icon={Wand2} className="icon-pulse-soft" {...props} />,
  Action: (props) => <IconWrapper icon={Zap} {...props} />,

  // Customer / E-Commerce
  Cart: (props) => <IconWrapper icon={ShoppingCart} {...props} />,
  User: (props) => <IconWrapper icon={User} {...props} />,
  Receipt: (props) => <IconWrapper icon={Receipt} {...props} />,
  Sandbox: (props) => <IconWrapper icon={TestTube} className="icon-float" {...props} />,
  Success: (props) => <IconWrapper icon={CheckCircle2} {...props} />,

  // Home Features
  FeatureBox: (props) => <IconWrapper icon={Package} className="icon-float" size={28} {...props} />,
  FeatureShield: (props) => <IconWrapper icon={Shield} className="icon-float" size={28} {...props} />,
  FeatureChart: (props) => <IconWrapper icon={BarChart3} className="icon-float" size={28} {...props} />,

  // Login
  Eye: (props) => <IconWrapper icon={Eye} {...props} />,
  EyeOff: (props) => <IconWrapper icon={EyeOff} {...props} />,
  Key: (props) => <IconWrapper icon={Key} {...props} />,

  // Support desk
  SupportDesk: (props) => <IconWrapper icon={MessagesSquare} {...props} />,
  Concierge: (props) => <IconWrapper icon={ConciergeBell} className="icon-float" {...props} />,
  Send: (props) => <IconWrapper icon={Send} {...props} />,
  Close: (props) => <IconWrapper icon={X} {...props} />,
};

export default Icons;
