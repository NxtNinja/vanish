import animals from "@/utils/animals";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";

const STORAGE_KEY = "chat_username";

const genertateUsername = () => {
  const word = animals[Math.floor(Math.random() * animals.length)];
  return `anonymous-${word}-${nanoid(5)}`;
};

export const useUsername = () => {
  const [username, setUsername] = useState("");
  useEffect(() => {
    const main = () => {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        setUsername(stored);
        return;
      }

      const newUsername = genertateUsername();
      localStorage.setItem(STORAGE_KEY, newUsername);
      setUsername(newUsername);
    };

    main();
  }, []);

  return { username };
};
