import { useState } from "react";
import { useNavigate } from 'react-router-dom'
import {signup} from "../../api/auth"
import {useAuth} from "../../context/AuthContext"
import Input from "../../components/Input"
import Button from "../../components/Button";

export default function SignupPage() {
  const [name,setName] = useState("")
  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [err,setErr] = useState("")

  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSignup = async (e) => {
    e.preventDefault()
    setErr("")
    try{
      const res = await signup({name,email,password});
      login(res.data.token)
      navigate("/dashboard")
    }catch(err){
      setErr(err.response?.data?.message || "Something went wrong");
    }
  }
  
  return (
  <div className="max-w-md mx-auto py-16 px-4">
    <div>
      <form onSubmit={handleSignup}>
        <Input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />
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
