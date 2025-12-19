import type { Request, Response } from "express";
import codeWordService from "../services/CodeWordService";

/**
 * Set code word for authenticated user
 */
export const setCodeWord = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; // From auth middleware
    const { codeWord } = req.body;

    if (!codeWord) {
      return res.status(400).json({
        success: false,
        message: "Code word is required",
      });
    }

    const result = await codeWordService.setCodeWord(userId!, codeWord);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    console.error("❌ Set Code Word Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Get code word for authenticated user
 */
export const getCodeWord = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const codeWord = await codeWordService.getCodeWord(userId!);

    if (!codeWord) {
      return res.status(404).json({
        success: false,
        message: "Code word not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { codeWord },
    });
  } catch (error: unknown) {
    console.error("❌ Get Code Word Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Match code word for authenticated user
 */
export const matchCodeWord = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { codeWord } = req.body;

    if (!codeWord) {
      return res.status(400).json({
        success: false,
        message: "Code word is required",
      });
    }

    const result = await codeWordService.matchCodeWord(userId!, codeWord);

    return res.status(200).json({
      success: result.success,
      message: result.message,
      data: { isMatch: result.isMatch },
    });
  } catch (error: unknown) {
    console.error("❌ Match Code Word Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Update code word for authenticated user
 */
export const updateCodeWord = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { oldCodeWord, newCodeWord } = req.body;

    if (!oldCodeWord || !newCodeWord) {
      return res.status(400).json({
        success: false,
        message: "Both old and new code words are required",
      });
    }

    const result = await codeWordService.updateCodeWord(
      userId!,
      oldCodeWord,
      newCodeWord
    );

    return res.status(result.success ? 200 : 400).json({
      success: result.success,
      message: result.message,
    });
  } catch (error: unknown) {
    console.error("❌ Update Code Word Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Delete code word for authenticated user
 */
export const deleteCodeWord = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await codeWordService.deleteCodeWord(userId!);

    return res.status(result.success ? 200 : 404).json({
      success: result.success,
      message: result.message,
    });
  } catch (error: unknown) {
    console.error("❌ Delete Code Word Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Check if code word exists for authenticated user
 */
export const hasCodeWord = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const exists = await codeWordService.hasCodeWord(userId!);

    return res.status(200).json({
      success: true,
      data: { hasCodeWord: exists },
    });
  } catch (error: unknown) {
    console.error("❌ Check Code Word Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};
