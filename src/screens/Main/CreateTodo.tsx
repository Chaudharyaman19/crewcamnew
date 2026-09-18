import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import DropDownPicker from "react-native-dropdown-picker";
import CustomHeader from "../../components/CustomHeader";
import { colors } from "../../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import { isSuperAdminRole, normalizeRole } from "../../utils/roles";
import { useLanguage } from "../../context/LanguageContext";
import {
  fetchPhpEmployeeList,
  fetchPhpTodoList,
  normalizePhpEmployeeList,
  requestPhpCreateTodo,
} from "../../services/phpApi";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 64;
const ACCENT = "#55e6ee";
const SCREEN_BG = "#132746";
const CREATED_TODO_CACHE_KEY = "crewcam_created_todos";

type RootStackParamList = {
  ToDoMain: { createdTodo?: any };
  Notification: undefined;
  PreHome: { screen?: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const formatPhpDateTime = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
};

const getTodoCacheKeys = (token: string) => [
  `${CREATED_TODO_CACHE_KEY}:${token.trim()}`,
  CREATED_TODO_CACHE_KEY,
];

const getTodoListItems = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.todos)) return data.todos;
  if (Array.isArray(data?.todoList)) return data.todoList;
  if (Array.isArray(data?.todo_list)) return data.todo_list;
  if (Array.isArray(data?.tasks)) return data.tasks;
  if (data?.result && typeof data.result === "object") return getTodoListItems(data.result);
  if (data?.data && typeof data.data === "object") return getTodoListItems(data.data);
  return [];
};

const CreateTodoScreen = () => {
  const { t, formatName } = useLanguage();
  const [task, setTask] = useState("");
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [employee, setEmployee] = useState<string | null>(null);
  const [hod, setHod] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<"single" | "multiple">("single");

  const [role, setRole] = useState<string | null>(null);
  const [, setUserName] = useState<string | null>(null);

  const [employees, setEmployees] = useState<{ label: string; value: string; rawName: string }[]>([]);
  const [hods, setHods] = useState<{ label: string; value: string; rawName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [openEmp, setOpenEmp] = useState(false);
  const [openHod, setOpenHod] = useState(false);
  const [openMulti, setOpenMulti] = useState([false, false, false]);
  const [multiValues, setMultiValues] = useState<(string | null)[]>([null, null, null]);

  const navigation = useNavigation<NavigationProp>();

  // Fetch user role + name
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedRole = await AsyncStorage.getItem("user_role");
        const storedName = await AsyncStorage.getItem("user_name");
        if (storedRole) setRole(normalizeRole(storedRole));
        if (storedName) setUserName(storedName);
      } catch (err) {
        console.log("Error fetching user data:", err);
      }
    };
    fetchUserData();
  }, [formatName]);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("auth_token");
        if (!token) return;

        const data = await fetchPhpEmployeeList({token});
        setEmployees(
          normalizePhpEmployeeList(data).map((emp) => ({
            label: formatName(emp.name),
            value: emp.id,
            rawName: emp.name,
          })),
        );
      } catch (err) {
        console.log("Error fetching employees:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [formatName]);

  // Fetch HODs dynamically
  useEffect(() => {
    const fetchHods = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("auth_token");
        if (!token) return;

        const data = await fetchPhpEmployeeList({token});
        setHods(
          normalizePhpEmployeeList(data).map((hod) => ({
            label: formatName(hod.name),
            value: hod.id,
            rawName: hod.name,
          })),
        );
      } catch (err) {
        console.log("Error fetching HODs:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isSuperAdminRole(role)) fetchHods();
  }, [formatName, role]);

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('Notification');

  const handleDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (selectedDate) {
        const newDate = new Date(selectedDate);
        setDeadline(newDate);
        setShowTimePicker(true);
      }
    } else {
      setDeadline(selectedDate || deadline);
    }
  };

  const handleTimeChange = (_: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime && deadline) {
      const newDateTime = new Date(deadline);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setDeadline(newDateTime);
    }
  };

  const handleSave = async () => {
    if (!task.trim()) {
      Alert.alert("Please enter a task");
      return;
    }
    if (!deadline) {
      Alert.alert("Please select a deadline");
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const userId = await AsyncStorage.getItem("user_id");
      const empCode = await AsyncStorage.getItem("user_emp_code");
      if (!token) {
        Alert.alert("User not authenticated");
        setSaving(false);
        return;
      }

      let assignToValue = "";

      if (isSuperAdminRole(role)) {
        if (employee) {
          assignToValue = employee;
        } else if (hod) {
          assignToValue = hod;
        }
      } else if (role === "admin") {
        if (selectionMode === "single") {
          if (employee) {
            assignToValue = employee;
          }
        } else {
          const allIds: string[] = [];
          multiValues.forEach((v) => {
            if (v) {
              allIds.push(v);
            }
          });
          if (hod) {
            allIds.push(hod);
          }
          if (allIds.length > 0) {
            assignToValue = JSON.stringify([{ member: allIds.join(",") }]);
          }
        }
      }

      if (!assignToValue) {
        assignToValue = userId || empCode || token;
      }

      const createResponse = await requestPhpCreateTodo({
        token,
        description: task,
        deadline: formatPhpDateTime(deadline),
        assignTo: assignToValue,
      });
      console.log("[TODO CREATE RESPONSE]", JSON.stringify(createResponse));
      try {
        const listResponse = await fetchPhpTodoList({token});
        const listItems = getTodoListItems(listResponse);
        console.log("[TODO LIST AFTER CREATE]", JSON.stringify({
          count: listItems.length,
          response: listResponse,
        }));
      } catch (listError) {
        console.log("[TODO LIST AFTER CREATE ERROR]", listError);
      }
      const cacheKeys = getTodoCacheKeys(token);
      const cachedRaw = await AsyncStorage.getItem(cacheKeys[0]) || await AsyncStorage.getItem(cacheKeys[1]);
      let cachedTodos: any[] = [];
      try {
        cachedTodos = cachedRaw ? JSON.parse(cachedRaw) : [];
      } catch {
        cachedTodos = [];
      }
      const createdTodo = {
        id: `created-${Date.now()}`,
        assign_to: assignToValue,
        assign_By: "Self",
        deadline: formatPhpDateTime(deadline),
        description: task.trim(),
        status: "Pending",
        added: formatPhpDateTime(new Date()),
      };
      const nextCachedTodos = JSON.stringify([createdTodo, ...cachedTodos].slice(0, 25));
      await AsyncStorage.multiSet(cacheKeys.map((cacheKey) => [cacheKey, nextCachedTodos]));
      setSaving(false);

      setTask("");
      setDeadline(null);
      setEmployee(null);
      setHod(null);
      setMultiValues([null, null, null]);
      Alert.alert("Success", "Task created successfully", [
        { text: "OK", onPress: () => navigation.navigate("ToDoMain", { createdTodo }) },
      ]);
    } catch (err) {
      console.log("Save error:", err);
      setSaving(false);
      Alert.alert("Error", "Something went wrong");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() => navigation.navigate("PreHome", { screen: "PaymentLeave" })}
      />

      {Platform.OS === "ios" && showDatePicker && (
        <DateTimePicker
          value={deadline || new Date()}
          mode="datetime"
          display="spinner"
          onChange={handleDateChange}
        />
      )}

      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          value={deadline || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      {Platform.OS === "android" && showTimePicker && (
        <DateTimePicker
          value={deadline || new Date()}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      <LinearGradient colors={[SCREEN_BG, "#1f456f"]} style={styles.gradient}>
        <FlatList
          data={[]}
          keyExtractor={(item, index) => index.toString()}
          renderItem={() => null}
          ListHeaderComponent={
            <View style={styles.formCard}>
              <View style={styles.heroCard}>
                <Text style={styles.pageTitle}>{t('Create Todo')}</Text>
                <Text style={styles.pageSubTitle}>{t('Assign tasks with a deadline and responsible team member.')}</Text>
              </View>

              <Text style={styles.label}>{t('Create Task')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('Enter Task')}
              placeholderTextColor="#999"
              value={task}
              onChangeText={setTask}
            />

            <Text style={styles.label}>{t('Job Deadline')}</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <View style={styles.input}>
                <Text style={{ color: deadline ? "#FFFFFF" : "#999" }}>
                  {deadline ? deadline.toLocaleString() : t('Select date and time')}
                </Text>
              </View>
            </TouchableOpacity>

            {isSuperAdminRole(role) && (
              <>
                <Text style={styles.label}>{t('Select Employee')}</Text>
                {loading ? (
                  <ActivityIndicator color={ACCENT} />
                ) : (
                  <View style={styles.dropdownWrapper}>
                    <DropDownPicker
                      open={openEmp}
                      value={employee}
                      items={employees}
                      setOpen={setOpenEmp}
                      setValue={setEmployee}
                      setItems={setEmployees}
                      searchable
                      placeholder={t('Select Employee')}
                      style={styles.dropdown}
                      dropDownContainerStyle={styles.dropdownContainer}
                      dropDownDirection="BOTTOM"
                      listMode="SCROLLVIEW"
                      maxHeight={200}
                    />
                  </View>
                )}

                <Text style={styles.label}>{t('Select HOD')}</Text>
                {loading ? (
                  <ActivityIndicator color={ACCENT} />
                ) : (
                  <View style={styles.dropdownWrapper}>
                    <DropDownPicker
                      open={openHod}
                      value={hod}
                      items={hods}
                      setOpen={setOpenHod}
                      setValue={setHod}
                      setItems={setHods}
                      searchable
                      placeholder={t('Select HOD')}
                      style={styles.dropdown}
                      dropDownContainerStyle={styles.dropdownContainer}
                      dropDownDirection="BOTTOM"
                      listMode="SCROLLVIEW"
                      maxHeight={150}
                    />
                  </View>
                )}
              </>
            )}

            {role === "admin" && (
              <>
                <View style={styles.radioRow}>
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => setSelectionMode("single")}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        selectionMode === "single" && styles.radioChecked,
                      ]}
                    />
                    <Text style={styles.radioLabel}>{t('Single')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => setSelectionMode("multiple")}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        selectionMode === "multiple" && styles.radioChecked,
                      ]}
                    />
                    <Text style={styles.radioLabel}>{t('Multiple')}</Text>
                  </TouchableOpacity>
                </View>

                {selectionMode === "single" ? (
                  <View style={styles.dropdownWrapper}>
                    <DropDownPicker
                      open={openEmp}
                      value={employee}
                      items={employees}
                      setOpen={setOpenEmp}
                      setValue={setEmployee}
                      setItems={setEmployees}
                      searchable
                      placeholder={t('Select Employee')}
                      style={styles.dropdown}
                      dropDownContainerStyle={styles.dropdownContainer}
                      dropDownDirection="BOTTOM"
                      listMode="SCROLLVIEW"
                      maxHeight={150}
                    />
                  </View>
                ) : (
                  multiValues.map((val, i) => (
                    <View
                      key={i}
                      style={styles.dropdownWrapper}
                    >
                      <DropDownPicker
                        open={openMulti[i]}
                        value={val}
                        items={employees}
                        setOpen={(open) =>
                          setOpenMulti((prev) =>
                            prev.map((state, idx) =>
                              idx === i ? (typeof open === "function" ? open(state) : open) : state
                            )
                          )
                        }
                        setValue={(cb) =>
                          setMultiValues((prev) =>
                            prev.map((state, idx) =>
                              idx === i ? (typeof cb === "function" ? cb(state) : cb) : state
                            )
                          )
                        }
                        setItems={setEmployees}
                        searchable
                        placeholder={`${t('Select Employee')} ${i + 1}`}
                        style={styles.dropdown}
                        dropDownContainerStyle={styles.dropdownContainer}
                        dropDownDirection="BOTTOM"
                        listMode="SCROLLVIEW"
                        maxHeight={150}
                      />
                    </View>
                  ))
                )}
              </>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={SCREEN_BG} />
              ) : (
                <Text style={styles.saveButtonText}>{t('CREATE TODO')}</Text>
              )}
            </TouchableOpacity>
            </View>
          }
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

export default CreateTodoScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  gradient: {
    flex: 1,
  },
  form: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingBottom: 28,
  },
  formCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(19,39,70,0.95)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.24)',
  },
  heroCard: {
    backgroundColor: 'rgba(31,69,111,0.64)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.18)',
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  pageSubTitle: {
    color: '#dbeafe',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
    color: '#FFFFFF',
  },
  dropdownWrapper: {
    marginBottom: 12,
    zIndex: 1000,
    position: 'relative',
  },
  dropdown: {
    backgroundColor: colors.panel,
    borderColor: 'rgba(85,230,238,0.22)',
    minHeight: 42,
  },
  dropdownContainer: {
    backgroundColor: colors.panel,
    borderColor: 'rgba(85,230,238,0.22)',
  },
  saveButton: {
    backgroundColor: ACCENT,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  saveButtonText: {
    color: SCREEN_BG,
    fontSize: 14,
    fontWeight: 'bold',
  },
  radioRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: ACCENT,
    marginRight: 8,
  },
  radioChecked: {
    backgroundColor: ACCENT,
  },
  radioLabel: {
    color: '#FFFFFF',
    fontSize: 13,
  },
});
