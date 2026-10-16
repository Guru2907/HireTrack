import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login as loginApi } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/Input";
import Button from "../../components/Button";
import AuthFrame from "../../components/AuthFrame";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login, isLoggedIn } = useAuth();

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/dashboard");
    }
  }, [isLoggedIn, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr("");
    setIsSubmitting(true);
    try {
      const res = await loginApi({ email, password });
      login(res.data.token, res.data.name);
      navigate("/dashboard");
    } catch (err) {
      setErr(err.response?.data?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFrame
      eyebrow="Welcome back"
      title="Pick up where you left off."
      subtitle="Log in to see what needs a follow-up today."
      error={err}
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-accent hover:text-accent-hover">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin}>
        <Input type="email" name="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        <Input type="password" name="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        <Button type="submit" loading={isSubmitting} size="lg" className="mt-2 w-full">
          {isSubmitting ? "Logging in…" : "Log in"}
        </Button>
        {isSubmitting && (
          <p className="mt-3 text-center text-[13px] text-ink-muted" aria-live="polite">
            The server may take up to a minute to wake up on first load.
          </p>
        )}
      </form>
    </AuthFrame>
  );
}
