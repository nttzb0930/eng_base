import type { PropsWithChildren } from "react";

const AuthLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
};

export default AuthLayout;
