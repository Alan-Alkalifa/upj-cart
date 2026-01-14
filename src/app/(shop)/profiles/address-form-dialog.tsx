"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area"; // If you have this component, otherwise div with overflow is fine

import { getLocationData, addAddress, updateAddress } from "./actions";

// --- SCHEMA & TYPES ---

// Explicit schema definition to match your UI and Database needs
const addressFormSchema = z.object({
  label: z.string().min(1, "Label is required"),
  recipient_name: z.string().min(2, "Recipient name is required"),
  phone: z.string().min(10, "Phone number is required"),
  street_address: z.string().min(5, "Full address is required"),
  province_id: z.string().min(1, "Province is required"),
  province_name: z.string().optional(),
  city_id: z.string().min(1, "City is required"),
  city_name: z.string().optional(),
  district_id: z.string().min(1, "District is required"),
  district_name: z.string().optional(),
  subdistrict_id: z.string().min(1, "Sub-district is required"),
  subdistrict_name: z.string().optional(),
  postal_code: z.string().min(4, "Postal code is required"),
  is_default: z.boolean().default(false),
});

type FormValues = z.infer<typeof addressFormSchema>;

interface AddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addressToEdit?: any; // Replace with your Address type from Supabase types if available
}

export function AddressDialog({ open, onOpenChange, addressToEdit }: AddressDialogProps) {
  const [isPending, startTransition] = useTransition();
  
  // Location Data State
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [subdistricts, setSubdistricts] = useState<any[]>([]);

  // Initialize Form
  const form = useForm<FormValues>({
    resolver: zodResolver(addressFormSchema) as any,
    defaultValues: {
      label: "Home",
      recipient_name: "",
      phone: "",
      street_address: "",
      province_id: "",
      province_name: "",
      city_id: "",
      city_name: "",
      district_id: "",
      district_name: "",
      subdistrict_id: "",
      subdistrict_name: "",
      postal_code: "",
      is_default: false as boolean,
    },
  });

  // --- EFFECTS ---

  useEffect(() => {
    if (open) {
      if (addressToEdit) {
        // Edit Mode: Pre-fill form
        const values: FormValues = {
          label: addressToEdit.label || "Home",
          recipient_name: addressToEdit.recipient_name || "",
          phone: addressToEdit.phone || "",
          street_address: addressToEdit.street_address || "",
          province_id: addressToEdit.province_id || "",
          province_name: addressToEdit.province_name || "",
          city_id: addressToEdit.city_id || "",
          city_name: addressToEdit.city_name || "",
          district_id: addressToEdit.district_id || "",
          district_name: addressToEdit.district_name || "",
          subdistrict_id: addressToEdit.subdistrict_id || "",
          subdistrict_name: addressToEdit.subdistrict_name || "",
          postal_code: addressToEdit.postal_code || "",
          is_default: addressToEdit.is_default || false,
        };
        form.reset(values);
        loadCascadingData(addressToEdit);
      } else {
        // Create Mode: Reset form
        form.reset({
          label: "Home",
          recipient_name: "",
          phone: "",
          street_address: "",
          province_id: "",
          province_name: "",
          city_id: "",
          city_name: "",
          district_id: "",
          district_name: "",
          subdistrict_id: "",
          subdistrict_name: "",
          postal_code: "",
          is_default: false,
        });
        loadProvinces();
      }
    }
  }, [open, addressToEdit, form]);

  // --- DATA LOADING ---

  const loadProvinces = async () => {
    const data = await getLocationData("province");
    setProvinces(data);
  };

  const loadCascadingData = async (addr: any) => {
    await loadProvinces();
    if (addr.province_id) {
       const c = await getLocationData("city", addr.province_id);
       setCities(c);
    }
    if (addr.city_id) {
       const d = await getLocationData("district", addr.city_id);
       setDistricts(d);
    }
    if (addr.district_id) {
       const s = await getLocationData("subdistrict", addr.district_id);
       setSubdistricts(s);
    }
  };

  // --- HANDLERS ---

  const handleProvinceChange = async (val: string) => {
     const selected = provinces.find(p => p.province_id === val);
     
     form.setValue("province_id", val);
     form.setValue("province_name", selected?.province || "");
     
     // Reset children
     form.setValue("city_id", "");
     form.setValue("city_name", "");
     form.setValue("district_id", "");
     form.setValue("district_name", "");
     form.setValue("subdistrict_id", "");
     form.setValue("subdistrict_name", "");
     
     setCities([]); setDistricts([]); setSubdistricts([]);

     const data = await getLocationData("city", val);
     setCities(data);
  };

  const handleCityChange = async (val: string) => {
    const selected = cities.find(c => c.city_id === val);
    
    form.setValue("city_id", val);
    form.setValue("city_name", `${selected?.type} ${selected?.city_name}`);
    form.setValue("postal_code", selected?.postal_code || "");

    // Reset children
    form.setValue("district_id", "");
    form.setValue("district_name", "");
    form.setValue("subdistrict_id", "");
    form.setValue("subdistrict_name", "");
    
    setDistricts([]); setSubdistricts([]);

    const data = await getLocationData("district", val);
    setDistricts(data);
  };

  const handleDistrictChange = async (val: string) => {
    const selected = districts.find(d => d.subdistrict_id === val);
    
    form.setValue("district_id", val);
    form.setValue("district_name", selected?.subdistrict_name || "");
    
    // Reset children
    form.setValue("subdistrict_id", "");
    form.setValue("subdistrict_name", "");
    setSubdistricts([]);

    const data = await getLocationData("subdistrict", val);
    setSubdistricts(data);
  };

  const handleSubdistrictChange = (val: string) => {
     const selected = subdistricts.find(s => s.subdistrict_id === val);
     form.setValue("subdistrict_id", val);
     form.setValue("subdistrict_name", selected?.subdistrict_name || "");
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      // Ensure optional strings are at least empty strings
      province_name: values.province_name || "",
      city_name: values.city_name || "",
      district_name: values.district_name || "",
      subdistrict_name: values.subdistrict_name || ""
    };

    startTransition(async () => {
      let res;
      if (addressToEdit) {
        res = await updateAddress(addressToEdit.id, payload);
      } else {
        res = await addAddress(payload);
      }

      if (res?.error) {
        toast.error(typeof res.error === 'string' ? res.error : "Failed to save address");
      } else {
        toast.success(addressToEdit ? "Address updated" : "Address added");
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{addressToEdit ? "Edit Address" : "Add New Address"}</DialogTitle>
          <DialogDescription>
            Fill in the details below to {addressToEdit ? "update your" : "add a new"} shipping address.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Form Container */}
        <div className="max-h-[70vh] overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              
              {/* Row 1: Label & Recipient */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Label</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Home, Office" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recipient_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 2: Phone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="081234567890" type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Row 3: Province & City */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="province_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Province</FormLabel>
                      <Select 
                        onValueChange={handleProvinceChange} 
                        value={field.value} 
                        disabled={provinces.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Province" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {provinces.map((p) => (
                            <SelectItem key={p.province_id} value={p.province_id}>
                              {p.province}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <Select 
                        onValueChange={handleCityChange} 
                        value={field.value} 
                        disabled={!form.getValues("province_id")}
                      >
                        <FormControl>
                          <SelectTrigger>
                             <SelectValue placeholder="Select City" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cities.map((c) => (
                            <SelectItem key={c.city_id} value={c.city_id}>
                              {c.type} {c.city_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 4: District & Sub-district */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="district_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District (Kecamatan)</FormLabel>
                      <Select 
                        onValueChange={handleDistrictChange} 
                        value={field.value} 
                        disabled={!form.getValues("city_id")}
                      >
                        <FormControl>
                          <SelectTrigger>
                             <SelectValue placeholder="Select District" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {districts.map((d) => (
                            <SelectItem key={d.subdistrict_id} value={d.subdistrict_id}>
                              {d.subdistrict_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subdistrict_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-District (Kelurahan)</FormLabel>
                      <Select 
                        onValueChange={handleSubdistrictChange} 
                        value={field.value} 
                        disabled={!form.getValues("district_id")}
                      >
                        <FormControl>
                          <SelectTrigger>
                             <SelectValue placeholder="Select Sub-District" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subdistricts.map((s) => (
                            <SelectItem key={s.subdistrict_id} value={s.subdistrict_id}>
                              {s.subdistrict_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 5: Postal Code & Full Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              <FormField
                control={form.control}
                name="street_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Jl. Cendrawasih No. 10, RT/RW..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Default Checkbox */}
              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/20">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">Set as default address</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {/* Footer Actions */}
              <div className="flex justify-end pt-4 gap-2">
                <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Address
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}