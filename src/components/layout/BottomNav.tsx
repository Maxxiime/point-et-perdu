import { NavLink } from "react-router-dom";
import { Play, History, BarChart3, BookOpen, Settings } from "lucide-react";

const itemBase = "flex flex-col items-center justify-center gap-1 text-xs";
const iconBase = "size-6";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-card text-card-foreground z-50">
      <div className="grid grid-cols-5 h-16">
        <NavLink to="/" className={({isActive}) => `${itemBase} ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
          <Play className={iconBase} />
          <span>Jouer</span>
        </NavLink>
        <NavLink to="/historique" className={({isActive}) => `${itemBase} ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
          <History className={iconBase} />
          <span>Historique</span>
        </NavLink>
        <NavLink to="/stats" className={({isActive}) => `${itemBase} ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
          <BarChart3 className={iconBase} />
          <span>Statistiques</span>
        </NavLink>
        <NavLink to="/regles" className={({isActive}) => `${itemBase} ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
          <BookOpen className={iconBase} />
          <span>Règles</span>
        </NavLink>
        <NavLink to="/admin" className={({isActive}) => `${itemBase} ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
          <Settings className={iconBase} />
          <span>Admin</span>
        </NavLink>
      </div>
    </nav>
  );
}
