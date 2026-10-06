import { apiClient } from "./apiClient";

export type Animal = {
  id: string;
  name: string;
  species: "dog" | "cat" | "other";
  breed: string | null;
  age_months: number | null;
  city: string | null;
  photo_url: string | null;
  description: string | null;
  sex: "male" | "female" | null;
  size: "small" | "medium" | "large" | null;
  ong_id: string | null;
  status: "available" | "pending" | "adopted";
};

export async function listAvailableAnimals() {
  if (!apiClient) return [] as Animal[];
  const { data, error } = await apiClient.from("pets").select("*").eq("status", "available").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Animal[];
}

export type AnimalInput = Omit<Animal, "id" | "created_at">;

export async function submitAdoptionRequest(animalId: string, message: string) {
  if (!apiClient) throw new Error("Conecte a API antes de enviar uma solicitação.");
  const { data, error } = await apiClient.functions.invoke("adoption-requests", { body: { pet_id: animalId, message } });
  if (error) throw error;
  return data.request.id as string;
}

export async function saveAnimal(animal: Omit<Animal, "id"> & { id?: string }) {
  if (!apiClient) throw new Error("Conecte a API antes de cadastrar animais.");
  const { data, error } = await apiClient.functions.invoke("pets", { body: animal });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
