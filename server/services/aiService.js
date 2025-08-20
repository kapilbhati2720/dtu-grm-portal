require('dotenv').config();
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { HumanMessage } = require("@langchain/core/messages");

// Initialize the model connection
const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-1.5-flash",
  temperature: 0.3, // Lower temperature for more predictable, analytical responses
});

/**
 * Generates a synthetic grievance text based on a given scenario.
 * @param {string} scenario - The situation for the AI to write about.
 * @returns {Promise<string>} The AI-generated grievance text.
 */
const generateGrievance = async (scenario) => {
  const prompt = `
    You are a B.Tech student at Delhi Technological University (DTU). Your task is to write a formal grievance based on the following scenario.
    The grievance should be well-structured, polite, and clearly state the problem and the desired resolution.
    Do not add a subject line or your name/roll number or who it is addressed to, only write the body of the grievance.
    Scenario: "${scenario}"
    Grievance Body:
  `;
  const response = await model.invoke([new HumanMessage(prompt)]);
  return response.content;
};

/**
 * Analyzes a grievance to categorize it, assess severity, and provide reasoning.
 * @param {string} grievanceText - The full text of the grievance.
 * @returns {Promise<object>} An object containing category, severity, and reasoning.
 */
const triageGrievance = async (grievanceText) => {
  const prompt = `
    You are an expert AI triage officer for a university grievance system. 
    Analyze the following grievance text and provide your analysis in a JSON format.
    The possible categories are: "Academic", "Hostel", "Administration", "Library", "Accounts", "Other".
    The possible severity levels are: "Low", "Medium", "High", "Critical".
    Provide a brief, one-sentence reasoning for your choice of category and severity.
    Grievance Text: "${grievanceText}"
    Respond ONLY with a valid JSON object with the keys "category", "severity", and "reasoning".
  `;
  const response = await model.invoke([new HumanMessage(prompt)]);
  // Clean the string to remove markdown backticks and the "json" language identifier
  const cleanedString = response.content.replace(/```json/g, '').replace(/```/g, '').trim();

  // Parse the cleaned string
  return JSON.parse(cleanedString);
};

// Export both functions so they can be used by our routes
module.exports = { generateGrievance, triageGrievance };