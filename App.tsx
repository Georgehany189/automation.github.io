import React, { useState } from 'react';
import { ChakraProvider, Box, Heading, VStack, FormControl, FormLabel, Input, Textarea, Button, useToast, Select } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import './i18n'; // Import the i18n configuration

function App() {
  const { t, i18n } = useTranslation();
  const toast = useToast();

  const [agentName, setAgentName] = useState('');
  const [agentPurpose, setAgentPurpose] = useState('');
  const [automationSteps, setAutomationSteps] = useState('');

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      // Simulate API call to backend
      console.log({ agentName, agentPurpose, automationSteps });
      // In a real app, you'd send this data to your Flask/FastAPI backend
      // const response = await axios.post('/api/create-agent', { agentName, agentPurpose, automationSteps });

      toast({
        title: t('agent_creation_success'),
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      // Clear form
      setAgentName('');
      setAgentPurpose('');
      setAutomationSteps('');
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to create agent.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <ChakraProvider>
      <Box p={8} maxWidth="800px" mx="auto">
        <VStack spacing={6} align="stretch">
          <Select onChange={handleLanguageChange} defaultValue={i18n.language} width="fit-content" alignSelf="flex-end">
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </Select>

          <Heading as="h1" size="xl" textAlign="center">
            {t('app_name')}
          </Heading>
          <Text textAlign="center">{t('welcome_message')}</Text>

          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl id="agent-name" isRequired>
                <FormLabel>{t('agent_name_label')}</FormLabel>
                <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} />
              </FormControl>

              <FormControl id="agent-purpose" isRequired>
                <FormLabel>{t('agent_purpose_label')}</FormLabel>
                <Textarea value={agentPurpose} onChange={(e) => setAgentPurpose(e.target.value)} />
              </FormControl>

              <FormControl id="automation-steps" isRequired>
                <FormLabel>{t('automation_steps_label')}</FormLabel>
                <Textarea
                  value={automationSteps}
                  onChange={(e) => setAutomationSteps(e.target.value)}
                  placeholder='E.g., [{"action": "call_llm", "prompt": "generate business plan"}, {"action": "save_to_db"}]'
                />
              </FormControl>

              <Button type="submit" colorScheme="blue" size="lg" width="full">
                {t('submit_button')}
              </Button>
            </VStack>
          </form>
        </VStack>
      </Box>
    </ChakraProvider>
  );
}

export default App;
