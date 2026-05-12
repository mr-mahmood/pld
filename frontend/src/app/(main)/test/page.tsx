// In any component
'use client';
import { useToast } from '@/src/components/common/toastify/CustomToast';

export default function MyComponent() {
  const toast = useToast();

  const handleClick = () => {
    // All available color options:
    toast.primary('خوش آمدید');
    toast.secondary('Secondary color notification');
    toast.success('Success color notification');
    toast.danger('Danger color notification');
    toast.warning('Warning color notification');
    toast.info('Info color notification');
    toast.cyan('Cyan color notification');
    toast.orange('Orange color notification');
    toast.seeBlue('See Blue color notification');
    toast.purple('Purple color notification');
    toast.darkOrange('Dark Orange color notification');
    
    // With options
    toast.success('Custom duration and position', { 
      duration: 5000, 
      position: 'top-center' 
    });
  };

  return <button onClick={handleClick}>Show Notifications</button>;
}