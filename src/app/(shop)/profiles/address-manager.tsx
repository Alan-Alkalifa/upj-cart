"use client";

import { useState } from "react";
import { Plus, MapPin, MoreVertical, Trash, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { AddressDialog } from "./address-form-dialog";
import { deleteAddress, setAddressAsDefault } from "./actions";

interface AddressManagerProps {
  initialAddresses: any[];
}

export function AddressManager({ initialAddresses }: AddressManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    
    const res = await deleteAddress(id);
    if (res.error) toast.error(res.error);
    else toast.success("Address deleted");
  };

  const handleSetDefault = async (id: string) => {
    const res = await setAddressAsDefault(id);
    if (res.error) toast.error(res.error);
    else toast.success("Default address updated");
  };

  const openAdd = () => {
    setEditingAddress(null);
    setIsDialogOpen(true);
  };

  const openEdit = (addr: any) => {
    setEditingAddress(addr);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add New Address
        </Button>
      </div>

      <div className="grid gap-4">
        {initialAddresses.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            <p>No addresses saved yet.</p>
          </div>
        )}

        {initialAddresses.map((addr) => (
          <Card key={addr.id} className={`relative ${addr.is_default ? "border-primary bg-primary/5" : ""}`}>
            <CardContent className="p-4 flex gap-4 items-start">
              <div className="mt-1 bg-muted p-2 rounded-full">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{addr.label}</span>
                  {addr.is_default && <Badge variant="secondary" className="text-[10px] h-5">Default</Badge>}
                </div>
                
                <p className="font-medium text-sm">{addr.recipient_name} <span className="text-muted-foreground font-normal">| {addr.phone}</span></p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {addr.street_address}<br/>
                  {addr.subdistrict_name}, {addr.district_name}<br/>
                  {addr.city_name}, {addr.province_name} {addr.postal_code}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!addr.is_default && (
                    <DropdownMenuItem onClick={() => handleSetDefault(addr.id)}>
                      <Check className="mr-2 h-4 w-4" /> Set as Default
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => openEdit(addr)}>
                    Edit Address
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(addr.id)} className="text-destructive focus:text-destructive">
                    <Trash className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
      </div>

      <AddressDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        addressToEdit={editingAddress} 
      />
    </div>
  );
}