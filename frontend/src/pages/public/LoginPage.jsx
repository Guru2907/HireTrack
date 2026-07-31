import { useState } from "react";
import { useNavigate } from 'react-router-dom'
import {login as loginApi} from "../../api/auth"
import {useAuth} from "../../context/AuthContext"
import Input from "../../components/Input"
import Button from "../../components/Button";

export default function LoginPage() {
  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [err,setErr] = useState("")

  const navigate = useNavigate()
  const { login } = useAuth()

  const handleLogin = async (e) => {
      e.preventDefault()
      setErr("")
      try{
        const res = await loginApi({email,password});
        login(res.data.token)
        navigate("/dashboard")
      }catch(err){
        setErr(err.response?.data?.message || "Something went wrong");
      }
    }
  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div>
        <form onSubmit={handleLogin}>
                <Input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
                <Input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <Button
                  children="Submit"
                  type="submit"
                />
              </form>
      </div>
    </div>
  )
}
