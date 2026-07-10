import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Home, Users, User, Settings, Plus, Key } from "lucide-react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "./ui/command"
import { rooms as roomsApi, users as usersApi } from "../services/api"
import { useAuth } from "../hooks/useAuth"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [rooms, setRooms] = useState([])
  const [friends, setFriends] = useState([])
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  useEffect(() => {
    if (open && user) {
      // Fetch rooms and friends for listing
      roomsApi.getAll().then((res) => setRooms(res.data || [])).catch(() => {})
      usersApi.getFriends().then((res) => setFriends(res.data || [])).catch(() => {})
    }
  }, [open, user])

  const runCommand = (action) => {
    setOpen(false)
    action()
  }

  if (!user) return null

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Suggestions">
          <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
            <Home className="mr-2 h-4 w-4" />
            <span>Go to Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/friends"))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Search & Manage Friends</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/profile"))}>
            <User className="mr-2 h-4 w-4" />
            <span>Open Profile & Analytics</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/profile?tab=settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Open Settings</span>
          </CommandItem>
        </CommandGroup>

        {rooms.length > 0 && (
          <CommandGroup heading="Active Rooms">
            {rooms.slice(0, 5).map((room) => (
              <CommandItem
                key={room._id}
                onSelect={() => runCommand(() => navigate(`/room/${room._id}`))}
              >
                <Key className="mr-2 h-4 w-4" />
                <span>Join {room.name} ({room.subject || "General"})</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {friends.length > 0 && (
          <CommandGroup heading="Friends">
            {friends.map((friend) => (
              <CommandItem
                key={friend._id}
                onSelect={() => runCommand(() => navigate(`/profile/${friend._id}`))}
              >
                <User className="mr-2 h-4 w-4" />
                <span>View {friend.username}'s Profile</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
