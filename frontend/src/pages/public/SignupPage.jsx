import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/Input";
import Button from "../../components/Button";
import AuthFrame from "../../components/AuthFrame";

export default function SignupPage() {
  const [name, setName] = useState("");
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

  const handleSignup = async (e) => {
    e.preventDefault();
    setErr("");
    setIsSubmitting(true);
    try {
      const res = await signup({ name, email, password });
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
      eyebrow="Create your account"
      title="Start your job-search ledger."
      subtitle="Track every application in one place, free."
      error={err}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-accent hover:text-accent-hover">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSignup}>
        <Input type="text" name="name" label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
        <Input type="email" name="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        <Input
          type="password"
          name="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          hint="At least 6 characters."
        />
        <Button type="submit" loading={isSubmitting} size="lg" className="mt-2 w-full">
          {isSubmitting ? "Creating account…" : "Create account"}
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
