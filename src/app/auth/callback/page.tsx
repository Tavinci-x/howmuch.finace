"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message,setMessage]=useState('Finishing sign in…')

  useEffect(()=>{
    const code=new URLSearchParams(window.location.search).get('code')
    if(!code){setMessage('The sign-in link is invalid or has expired.');return}
    createClient().auth.exchangeCodeForSession(code).then(({error})=>{
      if(error){setMessage('Sign in could not be completed.');return}
      router.replace('/')
      router.refresh()
    })
  },[router])

  return <div className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">{message}</div>
}
