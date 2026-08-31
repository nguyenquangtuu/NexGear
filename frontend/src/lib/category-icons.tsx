import type { LucideIcon } from 'lucide-react';
import {
  Apple,
  BookOpen,
  Brain,
  Briefcase,
  Camera,
  Cloud,
  Code,
  Cpu,
  Database,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  HardDrive,
  Headphones,
  Image as ImageIcon,
  Laptop,
  Layout,
  LockKeyhole,
  Monitor,
  MonitorSmartphone,
  Package,
  Router,
  Server,
  Settings2,
  ShieldCheck,
  Smartphone,
  SmartphoneCharging,
  Speaker,
  Tablet,
  TabletSmartphone,
  Tv,
  WalletCards,
  Watch,
  Wrench,
} from 'lucide-react';

export type CategoryIconName =
  | 'Apple'
  | 'Brain'
  | 'Gamepad2'
  | 'Code'
  | 'ImageIcon'
  | 'Briefcase'
  | 'GraduationCap'
  | 'Smartphone'
  | 'SmartphoneCharging'
  | 'Tablet'
  | 'TabletSmartphone'
  | 'Laptop'
  | 'MonitorSmartphone'
  | 'Monitor'
  | 'Tv'
  | 'Watch'
  | 'Camera'
  | 'Headphones'
  | 'Speaker'
  | 'HardDrive'
  | 'Router'
  | 'Layout'
  | 'Database'
  | 'ShieldCheck'
  | 'Gift'
  | 'Server'
  | 'Cloud'
  | 'Globe'
  | 'LockKeyhole'
  | 'Wrench'
  | 'Settings2'
  | 'Cpu'
  | 'BookOpen'
  | 'WalletCards'
  | 'Package';

export const categoryIconMap: Record<CategoryIconName, LucideIcon> = {
  Apple,
  Brain,
  Gamepad2,
  Code,
  ImageIcon,
  Briefcase,
  GraduationCap,
  Smartphone,
  SmartphoneCharging,
  Tablet,
  TabletSmartphone,
  Laptop,
  MonitorSmartphone,
  Monitor,
  Tv,
  Watch,
  Camera,
  Headphones,
  Speaker,
  HardDrive,
  Router,
  Layout,
  Database,
  ShieldCheck,
  Gift,
  Server,
  Cloud,
  Globe,
  LockKeyhole,
  Wrench,
  Settings2,
  Cpu,
  BookOpen,
  WalletCards,
  Package,
};

export const availableCategoryIcons: Array<{
  name: CategoryIconName;
  icon: LucideIcon;
  label: string;
}> = [
  { name: 'Apple', icon: Apple, label: 'Apple' },
  { name: 'Smartphone', icon: Smartphone, label: 'Samsung phone' },
  { name: 'SmartphoneCharging', icon: SmartphoneCharging, label: 'Xiaomi phone' },
  { name: 'Tablet', icon: Tablet, label: 'Tablet' },
  { name: 'TabletSmartphone', icon: TabletSmartphone, label: 'Phone + tablet' },
  { name: 'Laptop', icon: Laptop, label: 'Laptop' },
  { name: 'MonitorSmartphone', icon: MonitorSmartphone, label: 'Multi device' },
  { name: 'Monitor', icon: Monitor, label: 'Monitor' },
  { name: 'Tv', icon: Tv, label: 'TV' },
  { name: 'Watch', icon: Watch, label: 'Watch' },
  { name: 'Camera', icon: Camera, label: 'Camera' },
  { name: 'Headphones', icon: Headphones, label: 'Headphones' },
  { name: 'Speaker', icon: Speaker, label: 'Speaker' },
  { name: 'HardDrive', icon: HardDrive, label: 'Storage' },
  { name: 'Router', icon: Router, label: 'Router' },
  { name: 'Cpu', icon: Cpu, label: 'Chip' },
  { name: 'Brain', icon: Brain, label: 'Smart tech' },
  { name: 'Gamepad2', icon: Gamepad2, label: 'Gaming' },
  { name: 'Code', icon: Code, label: 'Accessories' },
  { name: 'ImageIcon', icon: ImageIcon, label: 'Display' },
  { name: 'Briefcase', icon: Briefcase, label: 'Business' },
  { name: 'GraduationCap', icon: GraduationCap, label: 'Education' },
  { name: 'Layout', icon: Layout, label: 'General' },
  { name: 'Database', icon: Database, label: 'Data' },
  { name: 'ShieldCheck', icon: ShieldCheck, label: 'Security' },
  { name: 'Gift', icon: Gift, label: 'Gift' },
  { name: 'Server', icon: Server, label: 'Server' },
  { name: 'Cloud', icon: Cloud, label: 'Cloud' },
  { name: 'Globe', icon: Globe, label: 'Global' },
  { name: 'LockKeyhole', icon: LockKeyhole, label: 'Privacy' },
  { name: 'Wrench', icon: Wrench, label: 'Tools' },
  { name: 'Settings2', icon: Settings2, label: 'Settings' },
  { name: 'BookOpen', icon: BookOpen, label: 'Books' },
  { name: 'WalletCards', icon: WalletCards, label: 'Deals' },
  { name: 'Package', icon: Package, label: 'Package' },
];

export function getCategoryIcon(name?: string | null) {
  if (!name) return Layout;
  return categoryIconMap[name as CategoryIconName] || Layout;
}
