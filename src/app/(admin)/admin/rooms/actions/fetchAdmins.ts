import { createClient } from "@/lib/supabase/server"


export async function fetchAdmins() {
    const supabase = await createClient()

    await supabase.auth.getSession()

    const { data, error } = await supabase
        .from("profiles")
        .select("email")
        .eq("role", "admin")

    if (error) {
        console.error("Error fetching admin emails", error)
        return
    }

    const emails = data.map((profile: { email: string }) => profile.email)
    
    return emails
    
}