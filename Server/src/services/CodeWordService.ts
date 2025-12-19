import { CodeWord } from "../models/CodeWord";
import { User } from "../models/User";
import { Types } from "mongoose";

export class CodeWordService {
  /**
   * Set code word for a user
   */
  async setCodeWord(
    userId: string | Types.ObjectId,
    codeWord: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Normalize code word (convert to lowercase and trim)
      const normalizedCodeWord = codeWord.toLowerCase().trim();

      if (!normalizedCodeWord || normalizedCodeWord.length < 3) {
        throw new Error("Code word must be at least 3 characters long");
      }

      // Check if code word already exists for this user
      const existingCodeWord = await CodeWord.findOne({ userId });

      if (existingCodeWord) {
        // Update existing code word
        existingCodeWord.codeWord = normalizedCodeWord;
        await existingCodeWord.save();

        return {
          success: true,
          message: "Code word updated successfully",
        };
      } else {
        // Create new code word
        await CodeWord.create({
          userId,
          codeWord: normalizedCodeWord,
        });

        return {
          success: true,
          message: "Code word set successfully",
        };
      }
    } catch (error) {
      throw new Error(`Error setting code word: ${(error as Error).message}`);
    }
  }

  /**
   * Get code word for a user
   */
  async getCodeWord(userId: string | Types.ObjectId): Promise<string | null> {
    try {
      const codeWordRecord = await CodeWord.findOne({ userId });
      return codeWordRecord ? codeWordRecord.codeWord : null;
    } catch (error) {
      throw new Error(`Error getting code word: ${(error as Error).message}`);
    }
  }

  /**
   * Match code word (case-insensitive and trimmed)
   */
  async matchCodeWord(
    userId: string | Types.ObjectId,
    codeWord: string
  ): Promise<{ success: boolean; message: string; isMatch?: boolean }> {
    try {
      const storedCodeWord = await this.getCodeWord(userId);

      if (!storedCodeWord) {
        return {
          success: false,
          message: "Code word not set for this user",
          isMatch: false,
        };
      }

      // Normalize input code word
      const normalizedInput = codeWord.toLowerCase().trim();

      // Check similarity
      const isMatch = storedCodeWord === normalizedInput;

      return {
        success: true,
        message: isMatch ? "Code word matched" : "Code word does not match",
        isMatch,
      };
    } catch (error) {
      throw new Error(`Error matching code word: ${(error as Error).message}`);
    }
  }

  /**
   * Update code word
   */
  async updateCodeWord(
    userId: string | Types.ObjectId,
    oldCodeWord: string,
    newCodeWord: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // First verify old code word
      const matchResult = await this.matchCodeWord(userId, oldCodeWord);

      if (!matchResult.isMatch) {
        return {
          success: false,
          message: "Old code word does not match",
        };
      }

      // Set new code word
      return await this.setCodeWord(userId, newCodeWord);
    } catch (error) {
      throw new Error(`Error updating code word: ${(error as Error).message}`);
    }
  }

  /**
   * Delete code word
   */
  async deleteCodeWord(
    userId: string | Types.ObjectId
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await CodeWord.deleteOne({ userId });

      if (result.deletedCount === 0) {
        return {
          success: false,
          message: "Code word not found",
        };
      }

      return {
        success: true,
        message: "Code word deleted successfully",
      };
    } catch (error) {
      throw new Error(`Error deleting code word: ${(error as Error).message}`);
    }
  }

  /**
   * Check if code word exists for user
   */
  async hasCodeWord(userId: string | Types.ObjectId): Promise<boolean> {
    try {
      const codeWord = await CodeWord.findOne({ userId });
      return !!codeWord;
    } catch (error) {
      throw new Error(`Error checking code word: ${(error as Error).message}`);
    }
  }
}

export default new CodeWordService();
