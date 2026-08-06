import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login as loginApi } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/Input";
import Button from "../../components/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const { login, isLoggedIn } = useAuth();
  
  useEffect(() => {
    if (isLoggedIn) {
      navigate("/dashboard");
    }
  }, [isLoggedIn, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const res = await loginApi({ email, password });
      login(res.data.token, res.data.name);
      navigate("/dashboard");
    } catch (err) {
      setErr(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">
          Welcome back
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Log in to keep tracking your applications.
        </p>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {err}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <Input
            type="email"
            name="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Input
            type="password"
            name="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Button type="submit" className="w-full mt-2">
            Log In
          </Button>
        </form>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-blue-600 font-medium hover:text-blue-700"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
